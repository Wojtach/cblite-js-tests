import { TestCase } from "./test-case";
import { ITestResult } from "./test-result.types";
import {
  BasicAuthenticator,
  Replicator,
  ReplicatorActivityLevel,
  ReplicatorConfiguration,
  ReplicatorType,
  URLEndpoint,
  CollectionConfig,
  Collection,
  MutableDocument,
} from "cblite-js";
import { expect } from "chai";

/**
 * ReplicatorTests - reminder all test cases must start with 'test' in the name of the method or they will not run
 * */

 /**
  Replicator tests require local setup of Couchbase Server and Sync Gate to pass. 
  See the readme file for setup instructions. https://github.com/Couchbase-Ecosystem/cblite-js-tests/blob/main/README.md
 */

export class ReplicatorTests extends TestCase {
  constructor() {
    super();
  }

  private readonly SYNC_GATEWAY_URL = "ws://localhost:4984/projects";
  private readonly TEST_USERNAME = "demo@example.com";
  private readonly TEST_PASSWORD = "P@ssw0rd12";


  private createConfig(
    type: ReplicatorType = ReplicatorType.PUSH_AND_PULL,
    continuous: boolean = false,
    collection: Collection = this.defaultCollection,
    collectionConfig?: CollectionConfig
  ): ReplicatorConfiguration {
    const target = new URLEndpoint(this.SYNC_GATEWAY_URL);
    const config = new ReplicatorConfiguration(target);
    config.setReplicatorType(type);
    config.setContinuous(continuous);
    config.addCollection(collection, collectionConfig);
    
    // Add default authenticator
    const auth = new BasicAuthenticator(this.TEST_USERNAME, this.TEST_PASSWORD);
    config.setAuthenticator(auth);
    
    return config;
  }

  private async runReplication(config: ReplicatorConfiguration, reset: boolean = false,): Promise<void> {
    const replicator = await Replicator.create(config);
    
    let listenerToken: string;
    const completionPromise = new Promise<void>((resolve, reject) => {
      replicator.addChangeListener((change) => {
        const status = change.status;
        const activityLevel = status.getActivityLevel();

        if (config.getContinuous() && activityLevel === ReplicatorActivityLevel.IDLE) {
          replicator.stop();
        }
        if (activityLevel === ReplicatorActivityLevel.STOPPED) {
          const error = status.getError();
          if (error) {
            reject(new Error(`Replication ${JSON.stringify(error)}`));
          } else {
            resolve();
          }
        }
      }).then(token => {
        listenerToken = token;
      });
    });
    
    try {
      await replicator.start(reset);
      await completionPromise;
      console.log('after promise in runReplicator')
    } catch (e) {
      console.error(e)
    } finally {
      await replicator.removeChangeListener(listenerToken);
      replicator.stop();
    }
  }

  async testFilterPerformance(): Promise<ITestResult> {
    try {
      // Define dataset size (one dataset) and complex filter configuration
      const count = 100;
      console.log(`Testing dataset with ${count} documents...`);
  
      // Generate and save documents; using a single prefix "test"
      const prepareDocuments = async (count: number, prefix: string) => {
        const savedDocIds: string[] = [];
        for (let i = 0; i < count; i++) {
          const docId = `${prefix}_doc_${i}_${Date.now()}`;
          const docData = {
            type: i % 3 === 0 ? 'type1' : i % 3 === 1 ? 'type2' : 'type3',
            name: `Document ${i}`,
            documentType: 'project',
            team: 'team1',
            value: Math.random() * 1000,
            isActive: i % 2 === 0,
            tags: [`tag${i % 5}`, `tag${(i + 2) % 7}`]
          };
  
          // Create and save the document
          const mutableDoc = this.createDocumentWithIdAndData(docId, docData);
          await this.defaultCollection.save(mutableDoc);
          savedDocIds.push(docId);
        }
        return savedDocIds;
      };
  
      // Purge documents using their IDs
      const purgeDocuments = async (docIds: string[]) => {
        for (const id of docIds) {
          // Purge each document asynchronously
          await this.defaultCollection.purgeById(id);
        }
      };
  
    
      // Create dataset and push documents to the server
      const docIds = await prepareDocuments(count, "test");
      console.log(`Created ${docIds.length} documents`);

      console.log("created: ", await this.defaultCollection.count())
      const pushConfig = this.createConfig(ReplicatorType.PUSH, false);

      await this.runReplication(pushConfig);

  
      // (Optional) If desired, purge local copies before pull replication:
      await purgeDocuments(docIds);

      // const q2 = this.database.createQuery("select * from _default._default")
      // const q2results = await q2.execute();
      console.log("deleted: ", await this.defaultCollection.count())
  
      // Setup the filter configuration for pull replication
      const complexConfig = new CollectionConfig(undefined, undefined);
      complexConfig.setPullFilter((doc, flags) => {
        return doc.getString('type') === 'type1';
      });
  
      // Run pull replication using the complex filter and record the performance timing
      console.log("Testing replication with filter...");
      const startTime = Date.now();
      const collConfig = this.createConfig(
        ReplicatorType.PULL, false, this.defaultCollection, complexConfig
      )
      await this.runReplication(collConfig);
      const duration = Date.now() - startTime;
      console.log(`Performance with complex filter: ${duration} ms`);
  
      console.log('pulled: ', await this.defaultCollection.count() )
  
      return {
        testName: "testFilterPerformance",
        success: true,
        message: "Filter performance test completed successfully",
        data: duration.toString()
      };
    } catch (error) {
      console.log(JSON.stringify(error, null, 2))
      return {
        testName: "testFilterPerformance",
        success: false,
        message: `${error}`,
        data: error.stack || error.toString()
      };
    }
  }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testReplicatorConfigDefaultValues(): Promise<ITestResult> {
//     const target = new URLEndpoint("ws://localhost:4984/project");
//     const config = new ReplicatorConfiguration(target);
//     config.addCollection(this.collection);

//     try {
//       //check to make sure that the default values are being set in the configuration
//       expect(config.getCollections().length).to.be.equal(1);
//       expect(config.getCollections()[0]).to.be.equal(this.collection);
//       expect(config.getReplicatorType()).to.be.equal(
//         ReplicatorType.PUSH_AND_PULL
//       );

//       expect(config.getAcceptOnlySelfSignedCerts()).to.be.equal(
//         ReplicatorConfiguration.defaultSelfSignedCertificateOnly
//       );
//       expect(config.getAllowReplicatingInBackground()).to.be.equal(
//         ReplicatorConfiguration.defaultAllowReplicatingInBackground
//       );
//       expect(config.getAcceptParentDomainCookies()).to.be.equal(
//         ReplicatorConfiguration.defaultAcceptParentDomainCookies
//       );
//       expect(config.getAutoPurgeEnabled()).to.be.equal(
//         ReplicatorConfiguration.defaultEnableAutoPurge
//       );
//       expect(config.getContinuous()).to.be.equal(
//         ReplicatorConfiguration.defaultContinuous
//       );
//       expect(config.getHeartbeat()).to.be.equal(
//         ReplicatorConfiguration.defaultHeartbeat
//       );
//       expect(config.getMaxAttempts()).to.be.equal(
//         ReplicatorConfiguration.defaultMaxAttemptsSingleShot
//       );
//       expect(config.getMaxAttemptWaitTime()).to.be.equal(
//         ReplicatorConfiguration.defaultMaxAttemptsWaitTime
//       );

//       expect(config.getHeaders()).to.be.equal(undefined);
//       expect(config.getAuthenticator()).to.be.equal(undefined);
//       return {
//         testName: "testReplicatorConfigDefaultValues",
//         success: true,
//         message: `success`,
//         data: undefined,
//       };
//     } catch (error) {
//       return {
//         testName: "testReplicatorConfigDefaultValues",
//         success: false,
//         message: `${error}`,
//         data: undefined,
//       };
//     }
//   }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testReplicationStatusChangeListenerEvent(): Promise<ITestResult> {
//     try {
//       const config = this.createConfig();
//       let isError = false;
//       let didGetChangeStatus = false;

//       const replicator = await Replicator.create(config);
//       const token = await replicator.addChangeListener((change) => {
//         // Check to see if there was an error
//         const error = change.status.getError();
//         if (error !== undefined) {
//           isError = true;
//         }
//         didGetChangeStatus = true;
//       });

//       // Don't start with a new checkpoint
//       await replicator.start(false);
      
//       // Short wait to allow replication to make progress
//       await this.sleep(500);

//       // Clean up
//       await replicator.removeChangeListener(token);
//       await replicator.stop();

//       // Validate we got documents replicated
//       const count = await this.defaultCollection.count();
//       console.log('listener count: ', count)
//       expect(count.count).to.be.greaterThan(0);

//       // Validate our listener was called and there weren't errors
//       expect(isError).to.be.false;
//       expect(didGetChangeStatus).to.be.true;

//       return {
//         testName: "testReplicationStatusChangeListenerEvent",
//         success: true,
//         message: `success`,
//         data: undefined,
//       };
//     } catch (error) {
//       return {
//         testName: "testReplicationStatusChangeListenerEvent",
//         success: false,
//         message: `${error}`,
//         data: undefined,
//       };
//     }
//   }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testDocumentChangeListenerEvent(): Promise<ITestResult> {
//     try {
//       const config = this.createConfig();
//       let isError = false;
//       let didGetDocumentUpdate = false;

//       const replicator = await Replicator.create(config);
//       const token = await replicator.addDocumentChangeListener((change) => {
//         // Check to see if the documents were pushed or pulled
//         for (const doc of change.documents) {
//           if (doc.error !== undefined) {
//             isError = true;
//           }
//         }
//         didGetDocumentUpdate = true;
//       });

//       // Start the replicator
//       await replicator.start(false);
      
//       // Short wait to allow replication to make progress
//       await this.sleep(500);

//       // Clean up
//       await replicator.removeChangeListener(token);
//       await replicator.stop();

//       // Validate we got documents replicated
//       const count = await this.defaultCollection.count();
//       expect(count.count).to.be.greaterThan(0);

//       // Validate our listener was called and there weren't errors
//       expect(isError).to.be.false;
//       expect(didGetDocumentUpdate).to.be.true;

//       return {
//         testName: "testDocumentChangeListenerEvent",
//         success: true,
//         message: `success`,
//         data: undefined,
//       };
//     } catch (error) {
//       return {
//         testName: "testDocumentChangeListenerEvent",
//         success: false,
//         message: `${error}`,
//         data: undefined,
//       };
//     }
//   }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testEmptyPush(): Promise<ITestResult> {
//     try {
//       let isError = false;
//       let listenerToken;
//       const config = this.createConfig(ReplicatorType.PUSH, false);

//       const replicator = await Replicator.create(config);


//       const replicatorCompletionPromise = new Promise<void>((resolve, reject) => {
//         replicator.addChangeListener((change) => {
//           const status = change.status;
//           const activityLevel = status.getActivityLevel();
  
//           if (activityLevel === ReplicatorActivityLevel.STOPPED) {
//             const error = status.getError();
//             console.log({activityLevel})
//             if (error) {
//               isError = true;
//               reject();
//             } else {
//               resolve();
//             }
//           }
//         }).then(token => {
//           listenerToken = token;
//         });
//       });

//       await replicator.start(false);
//       await replicatorCompletionPromise;
//       await replicator.removeChangeListener(listenerToken);
//       await replicator.stop();

//       // Validate our listener was called and there weren't errors
//       expect(isError).to.be.false;
      
//       return {
//         testName: "testEmptyPush",
//         success: true,
//         message: "Successfully completed empty push replication",
//         data: undefined,
//       };
//     } catch (error) {
//       return {
//         testName: "testEmptyPush",
//         success: false,
//         message: `${error}`,
//         data: undefined,
//       };
//     }
//   }
//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testStartWithCheckpoint(): Promise<ITestResult> {
//     try {
//       // Create a test document with a unique ID to avoid conflicts
//       const testDocId = `test-doc-${Date.now()}`;
//       const doc = this.createDocument(testDocId);
//       doc.setString("species", "Tiger");
//       doc.setString("documentType", "project");  // Required by sync function
//       doc.setString("team", "team1"); 
//       await this.defaultCollection.save(doc);
  
//       // Push the document to Sync Gateway
//       const pushConfig = this.createConfig(ReplicatorType.PUSH, false);
//       await this.runReplication(pushConfig);
  
//       // Pull to establish checkpoint
//       const pullConfig = this.createConfig(ReplicatorType.PULL, false);
//       await this.runReplication(pullConfig);
      
//       // Purge the document from the local database
//       const docToDelete = await this.defaultCollection.document(testDocId);
//       if (docToDelete) {
//         await this.defaultCollection.purge(docToDelete);
//       }
  
//       // Verify the document was purged
//       const checkDoc = await this.defaultCollection.document(testDocId);
//       expect(checkDoc).to.be.undefined;
  
//       // Pull without reset (should not pull the document due to checkpoint)
//       await this.runReplication(pullConfig);
  
//       // Verify document still doesn't exist (checkpoint prevented pulling it)
//       const afterNormalPull = await this.defaultCollection.document(testDocId);
//       expect(afterNormalPull).to.be.undefined;
  
//       // Pull with reset checkpoint
//       await this.runReplication(pullConfig, true);
  
//       // Verify document was pulled after reset
//       const afterResetPull = await this.defaultCollection.document(testDocId);
//       expect(afterResetPull).to.not.be.undefined;
//       expect(afterResetPull.getId()).to.equal(testDocId);
  
//       return {
//         testName: "testStartWithCheckpoint",
//         success: true,
//         message: "Successfully verified checkpoint reset behavior",
//         data: undefined,
//       };
//     } catch (error) {
//       return {
//         testName: "testStartWithCheckpoint",
//         success: false,
//         message: `${error}`,
//         data: error.stack || error.toString(),
//       };
//     }
//   }
  

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testStartWithResetCheckpointContinuous(): Promise<ITestResult> {
//     try {
//      // Create a test document with a unique ID to avoid conflicts
//      const testDocId = `test-doc-continuous-${Date.now()}`;
//      const doc = this.createDocument(testDocId);
//      doc.setString("species", "Tiger");
//      doc.setString("documentType", "project"); // Required by sync function
//      doc.setString("team", "team1");
//      await this.defaultCollection.save(doc);
 
//      // Push the document to Sync Gateway
//      const pushConfig = this.createConfig(ReplicatorType.PUSH, true);
//      await this.runReplication(pushConfig);
 
//      // Pull to establish checkpoint
//      const pullConfig = this.createConfig(ReplicatorType.PULL, true);
//      await this.runReplication(pullConfig);
     
//      // Purge the document from the local database
//      const docToDelete = await this.defaultCollection.document(testDocId);
//      if (docToDelete) {
//        await this.defaultCollection.purge(docToDelete);
//      }
 
//      // Verify the document was purged
//      const checkDoc = await this.defaultCollection.document(testDocId);
//      expect(checkDoc).to.be.undefined;
 
//      // Pull without reset (should not pull the document due to checkpoint)
//      await this.runReplication(pullConfig);
 
//      // Verify document still doesn't exist (checkpoint prevented pulling it)
//      const afterNormalPull = await this.defaultCollection.document(testDocId);
//      expect(afterNormalPull).to.be.undefined;
 
//      // Pull with reset checkpoint
//      await this.runReplication(pullConfig, true);
 
//      // Verify document was pulled after reset
//      const afterResetPull = await this.defaultCollection.document(testDocId);
//      expect(afterResetPull).to.not.be.undefined;
//      expect(afterResetPull.getId()).to.equal(testDocId);
  
//       return {
//         testName: "testStartWithResetCheckpointContinuous",
//         success: true,
//         message: "Successfully verified checkpoint reset behavior with continuous replication",
//         data: undefined,
//       };
//     } catch (error) {
//       return {
//         testName: "testStartWithResetCheckpointContinuous",
//         success: false,
//         message: `${error}`,
//         data: error.stack || error.toString(),
//       };
//     }
//   }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testRemoveDocumentReplicationListener(): Promise<ITestResult> {
//     return {
//       testName: "testRemoveDocumentReplicationListener",
//       success: false,
//       message: "Not implemented",
//       data: undefined,
//     };
//   }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testDocumentReplicationEventWithPushConflict(): Promise<ITestResult> {
//     return {
//       testName: "testDocumentReplicationEventWithPushConflict",
//       success: false,
//       message: "Not implemented",
//       data: undefined,
//     };
//   }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testDocumentReplicationEventWithPullConflict(): Promise<ITestResult> {
//     try {
//       const docId = `doc-conflict-pull-${Date.now()}`;
//       const localDoc = this.createDocument(docId);
//       localDoc.setString("species", "Tiger");
//       localDoc.setString("pattern", "Star");
//       localDoc.setString("documentType", "project"); // Required by sync function
//       localDoc.setString("team", "team1");
//       await this.defaultCollection.save(localDoc);
      
//       const target = new URLEndpoint("ws://localhost:4984/projects");
//       const auth = new BasicAuthenticator("demo@example.com", "P@ssw0rd12");
      
//       // Push the document to Sync Gateway
//       let config = new ReplicatorConfiguration(target);
//       config.addCollection(this.defaultCollection);
//       config.setReplicatorType(ReplicatorType.PUSH);
//       config.setAuthenticator(auth);
      
//       await this.runReplication(config);
      
//       // Create a separate database to modify the document on Sync Gateway
//       const otherDB = await this.getDatabase(this.otherDatabaseName, this.directory, "");
//       await otherDB.open();
//       this.otherDatabase = otherDB;
//       const otherCollection = await otherDB.defaultCollection();
      
//       // Pull the document to the other database
//       config = new ReplicatorConfiguration(target);
//       config.addCollection(otherCollection);
//       config.setReplicatorType(ReplicatorType.PULL);
//       config.setAuthenticator(auth);
      
//       await this.runReplication(config);
      
//       // Modify the document in the other database
//       const otherDoc = await otherCollection.document(docId);
//       const mutableOtherDoc = MutableDocument.fromDocument(otherDoc);
//       mutableOtherDoc.setString("pattern", "Striped"); // Different from "Star"
//       await otherCollection.save(mutableOtherDoc);
      
//       // Push the modified document back to Sync Gateway
//       config = new ReplicatorConfiguration(target);
//       config.addCollection(otherCollection);
//       config.setReplicatorType(ReplicatorType.PUSH);
//       config.setAuthenticator(auth);
      
//       await this.runReplication(config);
      
//       // Now we have a conflict: local document is "Star", Sync Gateway has "Striped"
      
//       // Try to pull, which should merge with local version
//       config = new ReplicatorConfiguration(target);
//       config.addCollection(this.defaultCollection);
//       config.setReplicatorType(ReplicatorType.PULL);
//       config.setAuthenticator(auth);
      
//       const replicator = await Replicator.create(config);
      
//       // Track the replication events
//       let conflictDoc: any = null;
      
//       const docChangePromise = new Promise<void>((resolve) => {
//         replicator.addDocumentChangeListener((change) => {
//           if (!change.isPush) {
//             for (const doc of change.documents) {
//               if (doc.id === docId) {
//                 conflictDoc = doc;
//                 resolve();
//               }
//             }
//           }
//         });
//       });
      
//       // Start replication and wait for the document change event
//       await replicator.start(false);
      
//       // Wait for the document change event or timeout
//       const timeoutPromise = new Promise<void>((_, reject) => {
//         setTimeout(() => reject(new Error("Timeout waiting for document change event")), 5000);
//       });
      
//       try {
//         await Promise.race([docChangePromise, timeoutPromise]);
//       } catch (e) {
//         // If we timeout, stop replication and throw
//         await replicator.stop();
//         throw e;
//       }
      
//       // Stop replication
//       await replicator.stop();
      
//       // Verify the document replication event
//       expect(conflictDoc).to.not.be.null;
//       expect(conflictDoc.id).to.equal(docId);
//       expect(conflictDoc.error).to.be.undefined; // Pull conflict doesn't report an error
      
//       // Check that the document was updated with the remote version
//       const updatedDoc = await this.defaultCollection.document(docId);
//       expect(updatedDoc.getString("pattern")).to.equal("Striped");
      
//       return {
//         testName: "testDocumentReplicationEventWithPullConflict",
//         success: true,
//         message: "Successfully verified document replication event with pull conflict",
//         data: undefined,
//       };
//     } catch (error) {
//       return {
//         testName: "testDocumentReplicationEventWithPullConflict",
//         success: false,
//         message: `${error}`,
//         data: error.stack || error.toString(),
//       };
//     } finally {
//       // Clean up the other database
//       if (this.otherDatabase) {
//         await this.otherDatabase.close();
//         await this.deleteDatabase(this.otherDatabase);
//         this.otherDatabase = undefined;
//       }
//     }
//   }
//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testDocumentReplicationEventWithDeletion(): Promise<ITestResult> {
//     return {
//       testName: "testDocumentReplicationEventWithDeletion",
//       success: false,
//       message: "Not implemented",
//       data: undefined,
//     };
//   }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
// async testSingleShotPushFilter(): Promise<ITestResult> {
//   try {
//     // Create test documents with unique IDs
//     const doc1Id = `test-doc-1-${Date.now()}`
//     const doc1 = this.createDocumentWithIdAndData(doc1Id, {
//       name: 'should-push', 
//       documentType: 'project', 
//       team: 'team1'
//     })
//     await this.defaultCollection.save(doc1)

//     const doc2Id = `test-doc-2-${Date.now()}`
//     const doc2 = this.createDocumentWithIdAndData(doc2Id, {
//       name: 'not-push', 
//       documentType: 'project', 
//       team: 'team1'
//     })
//     await this.defaultCollection.save(doc2)

//     // Create collection config with push filter
//     const collectionConfig = new CollectionConfig();
//     collectionConfig.setPushFilter((doc) => {
//       "show source";
      
//       return doc.name !== 'not-push';
//     })

//     // Create replicator with push filter
//     const replConfig = this.createConfig(
//       ReplicatorType.PUSH, 
//       false, // not continuous (single shot)
//       this.defaultCollection,
//       collectionConfig
//     )

//     // Run the replication
//     await this.runReplication(replConfig);

//     // Clean local database and pull from Sync Gateway to verify which documents were pushed
//     await this.defaultCollection.purgeById(doc1Id);
//     await this.defaultCollection.purgeById(doc2Id);
    
//     // Verify documents were purged
//     expect(await this.defaultCollection.getDocument(doc1Id)).to.be.undefined;
//     expect(await this.defaultCollection.getDocument(doc2Id)).to.be.undefined;

//     // Pull from Sync Gateway without filter
//     const pullConfig = this.createConfig(ReplicatorType.PULL, false, this.defaultCollection);
//     await this.runReplication(pullConfig);

//     // Verify doc1 was pushed (should be pulled back)
//     const replicatedDoc = await this.defaultCollection.getDocument(doc1Id);
//     expect(replicatedDoc).to.not.be.undefined;
//     expect(replicatedDoc.getData().name).to.equal('should-push');

//     // Verify doc2 was not pushed (should not be pulled back)
//     expect(await this.defaultCollection.getDocument(doc2Id)).to.be.undefined;

//     return {
//       testName: "testSingleShotPushFilter",
//       success: true,
//       message: "success",
//       data: undefined,
//     };
//   } catch (error) {
//     return {
//       testName: "testSingleShotPushFilter",
//       success: false,
//       message: `${error}`,
//       data: error.stack || error.toString(),
//     };
//   }
// }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
// async testContinuousPushFilter(): Promise<ITestResult> {
//   try {
//     // Create collection config with push filter
//     const collectionConfig = new CollectionConfig();
//     collectionConfig.setPushFilter((doc) => {
//       "show source";
//       return !doc.name.includes('not-push');
//     })

//     // Create replicator with push filter (continuous = true)
//     const replConfig = this.createConfig(
//       ReplicatorType.PUSH, 
//       true, // continuous
//       this.defaultCollection,
//       collectionConfig
//     )

//     // Start the continuous replicator manually
//     const replicator = await Replicator.create(replConfig);
//     let listenerToken: string;
    
//     // Set up a listener to track status changes
//     await new Promise<void>((resolve) => {
//       replicator.addChangeListener((change) => {
//         const status = change.status;
//         if (status.getActivityLevel() === ReplicatorActivityLevel.IDLE) {
//           resolve();
//         }
//       }).then(token => {
//         listenerToken = token;
//       });
      
//       replicator.start(false);
//     });
    
//     // Create documents while the continuous replicator is running
//     const doc1Id = `test-doc-1-${Date.now()}`
//     const doc1 = this.createDocumentWithIdAndData(doc1Id, {
//       name: 'should-push-continuous', 
//       documentType: 'project', 
//       team: 'team1'
//     })
//     await this.defaultCollection.save(doc1)
    
//     const doc2Id = `test-doc-2-${Date.now()}`
//     const doc2 = this.createDocumentWithIdAndData(doc2Id, {
//       name: 'not-push-continuous', 
//       documentType: 'project', 
//       team: 'team1'
//     })
//     await this.defaultCollection.save(doc2)
    
//     // Give the continuous replicator time to process the new documents
//     await this.sleep(100);
    
//     // Stop the replicator
//     await replicator.stop();
//     await replicator.removeChangeListener(listenerToken);
    
//     // Clean local database
//     await this.defaultCollection.purgeById(doc1Id);
//     await this.defaultCollection.purgeById(doc2Id);
    
//     // Pull to verify what was pushed
//     const pullConfig = this.createConfig(ReplicatorType.PULL, false, this.defaultCollection);
//     await this.runReplication(pullConfig);
    
//     // Verify doc1 was pushed and doc2 was filtered
//     const doc1After = await this.defaultCollection.getDocument(doc1Id);
//     const doc2After = await this.defaultCollection.getDocument(doc2Id);
    
//     expect(doc1After).to.not.be.undefined;
//     expect(doc1After.getData().name).to.equal('should-push-continuous');
//     expect(doc2After).to.be.undefined;

//     return {
//       testName: "testContinuousPushFilter",
//       success: true,
//       message: "success",
//       data: undefined,
//     };
//   } catch (error) {
//     return {
//       testName: "testContinuousPushFilter",
//       success: false,
//       message: `${error}`,
//       data: error.stack || error.toString(),
//     };
//   }
// }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testPullFilter(): Promise<ITestResult> {
//     try {
//     const doc1Id = `test-doc-1-${Date.now()}`
//     const doc1 =this.createDocumentWithIdAndData(doc1Id, {name: 'not-pull', documentType: 'project', team: 'team1'})
//     this.defaultCollection.save(doc1)

//     const doc2Id = `test-doc-2-${Date.now()}`
//     const doc2 = this.createDocumentWithIdAndData(doc2Id, {name: 'pull', documentType: 'project', team: 'team1'})
//     this.defaultCollection.save(doc2)
    
   

//     const replPushConfig = this.createConfig(ReplicatorType.PUSH, false, this.defaultCollection)
//     await this.runReplication(replPushConfig);

//     this.defaultCollection.purgeById(doc1Id)
//     this.defaultCollection.purgeById(doc2Id)

//     expect(await this.defaultCollection.getDocument(doc1Id)).to.be.undefined;  
//     expect(await this.defaultCollection.getDocument(doc2Id)).to.be.undefined;  
    
//     const collectionConfig = new CollectionConfig();

//     collectionConfig.setPullFilter((doc) => {
//       "show source";

//       return doc.name !== 'not-pull';
//     })

//     const replPullConfig = this.createConfig(ReplicatorType.PULL, false, this.defaultCollection,collectionConfig)

//     await this.runReplication(replPullConfig);

//     const replicatedDoc = await this.defaultCollection.getDocument(doc2Id);
//     expect(await this.defaultCollection.getDocument(doc1Id)).to.be.undefined;  
//     expect(replicatedDoc).to.not.be.undefined; 
//     expect(replicatedDoc.getData().name).to.be.equal('pull'); 
  
//     return {
//             testName: "testPullFilter",
//             success: true,
//             message: "success",
//             data: undefined,
//           };
//         } catch (error) {
//           return {
//             testName: "testPullFilter",
//             success: false,
//             message: `${error}`,
//             data: error.stack || error.toString(),
//           };
//         }
//   }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testPushAndForget(): Promise<ITestResult> {
//     return {
//       testName: "testPushAndForget",
//       success: false,
//       message: "Not implemented",
//       data: undefined,
//     };
//   }

// //   /**
// //    *
// //    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
// //    */
// // async testPullRemovedDocWithFilterSingleShot(): Promise<ITestResult> {

// // NOT WORKING

// //   try {
// //     // Create two documents with specific IDs
// //     const doc1Id = `doc1-${Date.now()}`;
// //     const passDocId = `pass-${Date.now()}`;
    
// //     // Create documents locally
// //     const doc1 = this.createDocumentWithIdAndData(doc1Id, {
// //       name: "pass",
// //       documentType: "project",
// //       team: "team1"
// //     });
    
// //     const passDoc = this.createDocumentWithIdAndData(passDocId, {
// //       name: "pass",
// //       documentType: "project", 
// //       team: "team1"
// //     });
    
// //     // Save documents locally and push to Sync Gateway
// //     await this.defaultCollection.save(doc1);
// //     await this.defaultCollection.save(passDoc);
    
// //     const pushConfig = this.createConfig(ReplicatorType.PUSH, false);
// //     await this.runReplication(pushConfig);
    
// //     // Create and open a second database instance
// //     if (!this.otherDatabase) {
// //       this.otherDatabase = await this.getDatabase(this.otherDatabaseName, this.directory, "");
// //       await this.otherDatabase.open();
// //     }
    
// //     const otherCollection = await this.otherDatabase.defaultCollection();
    
// //     // Pull documents into other database
// //     const otherPullConfig = this.createConfig(ReplicatorType.PULL, false, otherCollection);
// //     await this.runReplication(otherPullConfig);
    
// //     // Delete both documents in the other database
// //     const otherDoc1 = await otherCollection.getDocument(doc1Id);
// //     const otherPassDoc = await otherCollection.getDocument(passDocId);
    
// //     await otherCollection.purge(otherDoc1);
// //     await otherCollection.purge(otherPassDoc);
    
// //     // Push deletions back to server
// //     await this.runReplication(otherPullConfig.getReplicatorType(ReplicatorType.PUSH));
    
// //     // Delete documents locally to prepare for filtered pull
// //     await this.defaultCollection.purge(doc1);
// //     await this.defaultCollection.purge(passDoc);
    
// //     // Create collection config with pull filter for deletions
// //     const collectionConfig = new CollectionConfig();
// //     collectionConfig.setPullFilter((doc, flags) => {
// //       // Check if document is deleted
// //       "show source"

// //       const isDeleted = flags.includes("deleted");
      
// //       if (isDeleted) {
// //         // For deletions, only allow those with "pass" in the ID
// //         return doc.id.includes("pass");
// //       }
      
// //       // For regular documents, allow all with name "pass"
// //       return doc.name === "pass";
// //     });
    
// //     // Pull with filter to test deletion handling
// //     const pullConfig = this.createConfig(ReplicatorType.PULL, false, this.defaultCollection, collectionConfig);
// //     await this.runReplication(pullConfig);
    
// //     // Try to get documents locally after filtered pull
// //     const localDoc1 = await this.defaultCollection.getDocument(doc1Id);
// //     const localPassDoc = await this.defaultCollection.getDocument(passDocId);
    
// //     // Verify filter worked:
// //     // - doc1 should still exist (deletion rejected by filter)
// //     // - passDoc should be deleted (deletion allowed by filter)
// //     expect(localDoc1).to.not.be.undefined;
// //     expect(localPassDoc).to.be.undefined;
    
// //     return {
// //       testName: "testPullRemovedDocWithFilterSingleShot",
// //       success: true,
// //       message: "Successfully verified pull filter for selective deletions",
// //       data: undefined
// //     };
// //   } catch (error) {
// //     return {
// //       testName: "testPullRemovedDocWithFilterSingleShot",
// //       success: false,
// //       message: `${error}`,
// //       data: error.stack || error.toString()
// //     };
// //   }
// // }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testPullRemovedDocWithFilterContinuous(): Promise<ITestResult> {
//     return {
//       testName: "testPullRemovedDocWithFilterContinuous",
//       success: false,
//       message: "Not implemented",
//       data: undefined,
//     };
//   }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testStopAndRestartPushReplicationWithFilter(): Promise<ITestResult> {
//     return {
//       testName: "testStopAndRestartPushReplicationWithFilter",
//       success: false,
//       message: "Not implemented",
//       data: undefined,
//     };
//   }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testStopAndRestartPullReplicationWithFilter(): Promise<ITestResult> {
//     return {
//       testName: "testStopAndRestartPullReplicationWithFilter",
//       success: false,
//       message: "Not implemented",
//       data: undefined,
//     };
//   }

// /**
//  * Tests that removing a change listener properly prevents it from receiving further callbacks
//  * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object
//  */
// async testRemoveChangeListener(): Promise<ITestResult> {
//   let replicator = null;
//   let token = null;
//   const _engine = this.database.getEngine();
//   const getChangeListenersCount = () => _engine._eventEmitter.listenerCount(_engine._eventReplicatorStatusChange);

//   try {
//     // Create a configuration with a non-existent endpoint
//     const target = new URLEndpoint("ws://localhost:4083/unknown-db");
//     const config = new ReplicatorConfiguration(target);
//     config.setMaxAttempts(1);
//     config.addCollection(this.defaultCollection);
    
//     replicator = await Replicator.create(config);
    
//     // Check initial listener count
//     const initialCount = getChangeListenersCount();
    
//     // Add a listener
//     token = await replicator.addChangeListener(() => {});
    
//     // Verify listener was added at the event emitter level
//     const afterAddCount = getChangeListenersCount();
//     expect(afterAddCount).to.be.greaterThan(initialCount);
    
//     // Remove the listener
//     await replicator.removeChangeListener(token);
    
//     // Verify listener count decreased
//     const afterRemoveCount = getChangeListenersCount();
//     expect(afterRemoveCount).to.equal(initialCount);
    
//     return {
//       testName: "testRemoveChangeListener",
//       success: true,
//       message: "Successfully verified change listener removal",
//       data: undefined,
//     };
//   } catch (error) {
//     return {
//       testName: "testRemoveChangeListener",
//       success: false,
//       message: `${error}`,
//       data: error.stack || error.toString(),
//     };
//   } 
// }
//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testAddRemoveChangeListenerAfterReplicatorStart(): Promise<ITestResult> {
//     try {
//       const target = new URLEndpoint("ws://localhost:4083/unknown-db");
//       const config = new ReplicatorConfiguration(target);
//       config.setMaxAttempts(4);
//       config.setMaxAttemptWaitTime(2);
//       config.addCollection(this.defaultCollection);
      
//       const replicator = await Replicator.create(config);
      
//       // Track callback activity
//       let activityLevels: ReplicatorActivityLevel[] = [];
      
//       // Add a listener before starting replication
//       const token = await replicator.addChangeListener((change) => {
//         activityLevels.push(change.status.getActivityLevel());
//       });
      
//       // Start the replicator
//       await replicator.start(false);
      
//       // Wait a moment to receive some callbacks
//       await this.sleep(500);
      
//       // Verify we got some callbacks
//       expect(activityLevels.length).to.be.greaterThan(0);
      
//       // Remember how many callbacks we received
//       const callbackCount = activityLevels.length;
      
//       // Remove the listener while replicator is running
//       await replicator.removeChangeListener(token);
      
//       // Wait again to give time for potential callbacks
//       await this.sleep(500);
      
//       // Verify we didn't receive additional callbacks after removing the listener
//       expect(activityLevels.length).to.equal(callbackCount);
      
//       return {
//         testName: "testAddRemoveChangeListenerAfterReplicatorStart",
//         success: true,
//         message: "Successfully verified removing listener after replicator start",
//         data: undefined,
//       };
//     } catch (error) {
//       return {
//         testName: "testAddRemoveChangeListenerAfterReplicatorStart",
//         success: false,
//         message: `${error}`,
//         data: error.stack || error.toString(),
//       };
//     } 
//   }
//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testCopyingReplicatorConfiguration(): Promise<ITestResult> {
//     try {
//        // Create a target for configuration
//        const target = new URLEndpoint(this.SYNC_GATEWAY_URL);
      
//        // Create configuration with non-default values
//        const config = new ReplicatorConfiguration(target);
       
//        // Set authentication
//        const basic = new BasicAuthenticator("abcd", "1234");
//        config.setAuthenticator(basic);
       
//        // Set non-default values for all configurable properties
//        config.setContinuous(true);
//        config.setHeaders({ "a": "aa", "b": "bb" });
//        config.setReplicatorType(ReplicatorType.PULL);
//        config.setHeartbeat(211);
//        config.setMaxAttempts(223);
//        config.setMaxAttemptWaitTime(227);
//        config.setAcceptOnlySelfSignedCerts(true);
//        config.setAllowReplicatingInBackground(true);
//        config.setAutoPurgeEnabled(false);
//        config.setAcceptParentDomainCookies(true);
       
//        // Set pinnedServerCertificate
//        const certificateData = "MOCK_CERTIFICATE_DATA";
//        config.setPinnedServerCertificate(certificateData);
       
//        // Create a collection configuration with channels and document IDs
//        const colConfig = new CollectionConfig(["c1", "c2"], ["d1", "d2"]);
       
//        // Add collection with config
//        config.addCollection(this.defaultCollection, colConfig);
       
//        // Store original values for later comparison
//        const originalContinuous = config.getContinuous();
//        const originalReplicatorType = config.getReplicatorType();
//        const originalHeartbeat = config.getHeartbeat();
//        const originalMaxAttempts = config.getMaxAttempts();
//        const originalMaxAttemptWaitTime = config.getMaxAttemptWaitTime();
//        const originalSelfSignedCerts = config.getAcceptOnlySelfSignedCerts();
//        const originalBackgroundReplication = config.getAllowReplicatingInBackground();
//        const originalAutoPurge = config.getAutoPurgeEnabled();
//        const originalParentDomainCookies = config.getAcceptParentDomainCookies();
//        const originalCertificate = config.getPinnedServerCertificate();
//        const originalHeaders = JSON.stringify(config.getHeaders());
       
//        const originalAuth = config.getAuthenticator() as BasicAuthenticator;
//        let originalUsername = null;
//        let originalPassword = null;
//        if (originalAuth && originalAuth.toJson) {
//          originalUsername = originalAuth.toJson().username;
//          originalPassword = originalAuth.toJson().password;
//        }
       
//        // Create a replicator with the configuration
//        const replicator = await Replicator.create(config);
       
//        // Now modify the original configuration
//        config.setContinuous(false);
//        config.setAuthenticator(null);
//        config.setHeaders(null);
//        config.setReplicatorType(ReplicatorType.PUSH);
//        config.setHeartbeat(11);
//        config.setMaxAttempts(13);
//        config.setMaxAttemptWaitTime(17);
//        config.setPinnedServerCertificate(null);
//        config.setAcceptOnlySelfSignedCerts(false);
//        config.setAllowReplicatingInBackground(false);
//        config.setAutoPurgeEnabled(true);
//        config.setAcceptParentDomainCookies(false);
       
//        // Remove the collection and add it back with a new empty config
//        config.removeCollection(this.defaultCollection);
//        config.addCollection(this.defaultCollection);
       
//        // Get the configuration from the replicator
//        const replicatorConfig = replicator.getConfiguration();
       
//        // Verify the replicator's configuration still has the original values
//        expect(replicatorConfig.getContinuous()).to.equal(originalContinuous);
//        expect(replicatorConfig.getReplicatorType()).to.equal(originalReplicatorType);
//        expect(replicatorConfig.getHeartbeat()).to.equal(originalHeartbeat);
//        expect(replicatorConfig.getMaxAttempts()).to.equal(originalMaxAttempts);
//        expect(replicatorConfig.getMaxAttemptWaitTime()).to.equal(originalMaxAttemptWaitTime);
//        expect(replicatorConfig.getAcceptOnlySelfSignedCerts()).to.equal(originalSelfSignedCerts);
//        expect(replicatorConfig.getAllowReplicatingInBackground()).to.equal(originalBackgroundReplication);
//        expect(replicatorConfig.getAutoPurgeEnabled()).to.equal(originalAutoPurge);
//        expect(replicatorConfig.getAcceptParentDomainCookies()).to.equal(originalParentDomainCookies);
//        expect(replicatorConfig.getPinnedServerCertificate()).to.equal(originalCertificate);
//        expect(JSON.stringify(replicatorConfig.getHeaders())).to.equal(originalHeaders);
       
//        // Verify authenticator
//        const replicatorAuth = replicatorConfig.getAuthenticator() as BasicAuthenticator;
//        expect(replicatorAuth).to.not.be.null;
       
//        if (replicatorAuth && replicatorAuth.toJson) {
//          expect(replicatorAuth.toJson().username).to.equal(originalUsername);
//          expect(replicatorAuth.toJson().password).to.equal(originalPassword);
//        }
       
//        // Verify collection configuration
//        const collectionConfig = replicatorConfig.getCollectionConfig(this.defaultCollection);
//        expect(collectionConfig).to.not.be.null;
       
//        // Clean up
//        await replicator.stop();
//        await replicator.cleanup();
      
//       return {
//         testName: "testCopyingReplicatorConfiguration",
//         success: true,
//         message: "Successfully verified replicator configuration independence",
//         data: undefined,
//       };
//     } catch (error) {
//       return {
//         testName: "testCopyingReplicatorConfiguration",
//         success: false,
//         message: `${error}`,
//         data: error.stack || error.toString(),
//       };
//     }
//   }

//   /**
//    *
//    * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
//    */
//   async testReplicationConfigSetterMethods(): Promise<ITestResult> {
//     try {   
//        // Create a target for our configuration
//        const target = new URLEndpoint(this.SYNC_GATEWAY_URL);
//        const config = new ReplicatorConfiguration(target);
 
//        // Configure authentication
//        const basic = new BasicAuthenticator("test_user", "test_password");
//        config.setAuthenticator(basic);
       
//        // Set various configuration properties
//        config.setContinuous(true);
//        config.setHeaders({ "Custom-Header": "test-value", "X-App-ID": "test-app" });
//        config.setReplicatorType(ReplicatorType.PULL);
//        config.setHeartbeat(120);
//        config.setMaxAttempts(5);
//        config.setMaxAttemptWaitTime(180);
//        config.setAcceptOnlySelfSignedCerts(true);
//        config.setAllowReplicatingInBackground(true);
//        config.setAutoPurgeEnabled(false);
//        config.setAcceptParentDomainCookies(true);
       
//        // Set a mock certificate
//        const mockCertificate = "MOCK_CERTIFICATE_DATA";
//        config.setPinnedServerCertificate(mockCertificate);
       
//        // Configure collection
//        const collectionConfig = new CollectionConfig(["channel1", "channel2"], ["doc1", "doc2"]);
       
//        config.addCollection(this.defaultCollection, collectionConfig);
       
//        // Verify all getter methods return the values we set
//        expect(config.getContinuous()).to.be.true;
       
//        const auth = config.getAuthenticator() as BasicAuthenticator;
//        expect(auth).to.not.be.null;
       
//        expect(auth.toJson().username).to.equal("test_user");
//        expect(auth.toJson().password).to.equal("test_password");
       
//        expect(config.getHeaders()).to.deep.equal({ 
//          "Custom-Header": "test-value", 
//          "X-App-ID": "test-app" 
//        });
       
//        expect(config.getReplicatorType()).to.equal(ReplicatorType.PULL);      
//        expect(config.getHeartbeat()).to.equal(120);      
//        expect(config.getMaxAttempts()).to.equal(5);      
//        expect(config.getMaxAttemptWaitTime()).to.equal(180);      
//        expect(config.getPinnedServerCertificate()).to.equal(mockCertificate);      
//        expect(config.getAcceptOnlySelfSignedCerts()).to.be.true;      
//        expect(config.getAllowReplicatingInBackground()).to.be.true;      
//        expect(config.getAutoPurgeEnabled()).to.be.false;      
//        expect(config.getAcceptParentDomainCookies()).to.be.true;     
 
//        // Verify collection config
//        const retrievedCollectionConfig = config.getCollectionConfig(this.defaultCollection);
//        expect(retrievedCollectionConfig).to.not.be.null;
       
//        // Now create a replicator with this configuration
//        const replicator = await Replicator.create(config);
       
//        // Get the configuration from the replicator
//        const replicatorConfig = replicator.getConfiguration();
       
//        // Verify the replicator has the same configuration values
//        expect(replicatorConfig.getContinuous()).to.be.true;
       
//        const replicatorAuth = replicatorConfig.getAuthenticator() as BasicAuthenticator;
//        expect(replicatorAuth).to.not.be.null;
 
//        const authData = replicatorAuth.toJson();
//        expect(authData.username).to.equal("test_user");
//        expect(authData.password).to.equal("test_password");
 
//        expect(replicatorConfig.getHeaders()).to.deep.equal({ 
//          "Custom-Header": "test-value", 
//          "X-App-ID": "test-app" 
//        });
       
//        expect(replicatorConfig.getReplicatorType()).to.equal(ReplicatorType.PULL);      
//        expect(replicatorConfig.getHeartbeat()).to.equal(120);      
//        expect(replicatorConfig.getMaxAttempts()).to.equal(5);      
//        expect(replicatorConfig.getMaxAttemptWaitTime()).to.equal(180);      
//        expect(replicatorConfig.getPinnedServerCertificate()).to.equal(mockCertificate);      
//        expect(replicatorConfig.getAcceptOnlySelfSignedCerts()).to.be.true;      
//        expect(replicatorConfig.getAllowReplicatingInBackground()).to.be.true;
//        expect(replicatorConfig.getAutoPurgeEnabled()).to.be.false;
//        expect(replicatorConfig.getAcceptParentDomainCookies()).to.be.true;
      
//       return {
//         testName: "testReplicationConfigSetterMethods",
//         success: true,
//         message: "Successfully verified setter methods and replicator configuration",
//         data: undefined,
//       };
//     } catch (error) {
//       return {
//         testName: "testReplicationConfigSetterMethods",
//         success: false,
//         message: `${error}`,
//         data: error.stack || error.toString(),
//       };
//     }
//   }
}
