import { TestCase } from './test-case';
import { ITestResult } from './test-result.types';
import { assert, expect } from 'chai';
import {
  Blob,
  ConcurrencyControl,
  Database,
  DatabaseConfiguration,
  FileSystem,
  MaintenanceType,
  MutableDocument,
} from 'cblite-js';

/**
 * DatabaseTests - reminder all test cases must start with 'test' in the name of the method, or they will not run
 * */
export class DatabaseTests extends TestCase {
  constructor() {
    super();
  }

  /**
   * This method creates a new document with a predefined ID and name, saves it to the database,
   * and then verifies the document by comparing it with the expected data.
   *
   * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
   */
  async testCreateDocument(): Promise<ITestResult> {
    try {
      console.log(`****Starting testCreateDocument****`);
      const id = '123';
      const doc = new MutableDocument();
      doc.setId(id);
      doc.setString('name', 'Scott');
      const dic = doc.toDictionary;

      await this.database?.save(doc);
      return this.verifyDoc('testCreateDocument', id, JSON.stringify(dic));
    } catch (error) {
      return {
        testName: 'testCreateDocument',
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
  }

  /**
   * This method creates a new document with a predefined ID and name, saves it to the database,
   * and then deletes the document and validates the document is no longer in the database
   *
   * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
   */
  async testDeleteDocument(): Promise<ITestResult> {
    try {
      console.log(`****Starting testDeleteDocument****`);
      const id = '123';
      const doc = new MutableDocument();
      doc.setId(id);
      doc.setString('name', 'Scott');
      await this.database?.save(doc);
      const deleteResult = await this.database
        .deleteDocument(doc)
        .then(() => {
          return {
            testName: 'testDeleteDocument',
            success: true,
            message: 'success',
            data: undefined,
          };
        })
        .catch((error) => {
          return {
            testName: 'testDeleteDocument',
            success: false,
            message: JSON.stringify(error),
            data: undefined,
          };
        });
      return deleteResult;
    } catch (error) {
      return {
        testName: 'testCreateDocument',
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
  }

  /**
   * This method tests the properties of a database
   *
   * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
   */
  async testDatabaseProperties(): Promise<ITestResult> {
    console.log(`****Starting testDatabaseProperties****`);
    const pathResults = await this.getPlatformPath();
    if (!pathResults.success) {
      return pathResults;
    }
    const path = pathResults.data;
    try {
      const dbPath = await this.database?.getPath();
      const dbName = this.databaseName;
      const dbUniqueName = this.databaseUniqueName;
      const name = this.database?.getName();
      const uniqueName = this.database?.getUniqueName();

      expect(dbPath).to.include(path);
      expect(name).to.equal(dbName);
      expect(uniqueName).to.equal(dbUniqueName);

      return {
        testName: 'testDatabaseProperties',
        success: true,
        message: 'success',
        data: undefined,
      };
    } catch (error) {
      return {
        testName: 'testDatabaseProperties',
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
  }

  /**
   * This method tests creating documents with an ID and then
   * make sure the document was saved
   *
   * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
   */
  async testSaveDocWithId(): Promise<ITestResult> {
    try {
      console.log(`****Starting testSaveDocWithId****`);
      const docId = 'doc1';
      const doc = await this.createDocumentWithId(docId);
      const count = await this.getDocumentCount();
      assert.equal(1, count);
      await this.verifyDoc(
        'testSaveDocWithId',
        docId,
        JSON.stringify(doc.toDictionary)
      );
      return {
        testName: 'testSaveDocWithId',
        success: true,
        message: 'success',
        data: undefined,
      };
    } catch (error) {
      return {
        testName: 'testSaveDocWithId',
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
  }

  /**
   * This method tests creating documents with weird special characters
   * in the documentId to make sure the Javascript to Native Bridge
   * doesn't eat the characters and the document is saved correctly.
   *
   * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
   */
  async testSaveDocWithSpecialCharactersDocID(): Promise<ITestResult> {
    try {
      console.log(`****Starting testSaveDocWithSpecialCharactersDocID****`);
      const docId = await this.createDocumentWithId(
        '~@#$%^&*()_+{}|\\][=-/.,<>?":;'
      );
      const count = await this.getDocumentCount();
      assert.equal(1, count);
      await this.verifyDoc(
        'testSaveDocWithSpecialCharactersDocID',
        '~@#$%^&*()_+{}|\\][=-/.,<>?":;',
        JSON.stringify(docId.toDictionary)
      );
      return {
        testName: 'testSaveDocWithSpecialCharactersDocID',
        success: true,
        message: 'success',
        data: undefined,
      };
    } catch (error) {
      return {
        testName: 'testSaveDocWithSpecialCharactersDocID',
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
  }

  /**
   * This method tests updating documents multiple times and then
   * verifying the document sequence number
   *
   * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
   */
  async testSaveSameDocTwice(): Promise<ITestResult> {
    try {
      console.log(`****Starting testSaveSameDocTwice****`);
      //create document first time
      const docId = await this.createDocumentWithId('doc1');
      let count = await this.getDocumentCount();
      assert.equal(1, count);
      //save the same document again to check sequence number
      await this.database?.save(docId);
      const docSeq2 = await this.database?.getDocument('doc1');
      count = await this.getDocumentCount();
      assert.equal(1, count);
      assert.equal(2, docSeq2?.getSequence());
      return {
        testName: 'testSaveSameDocTwice',
        success: true,
        message: 'success',
        data: undefined,
      };
    } catch (error) {
      return {
        testName: 'testSaveSameDocTwice',
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
  }

  /**
   * This method tests creating and then updating the same document
   *
   * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
   */
  async testCreateAndUpdateMutableDoc(): Promise<ITestResult> {
    try {
      console.log(`****Starting testCreateAndUpdateMutableDoc****`);
      const doc = await this.createDocumentWithId('doc1');
      //update
      doc.setString('firstName', 'Steve');
      await this.database?.save(doc);
      let count = await this.getDocumentCount();
      assert.equal(1, count);

      //update
      doc.setString('lastName', 'Jobs');
      await this.database?.save(doc);
      count = await this.getDocumentCount();
      assert.equal(1, count);

      doc.setInt('age', 56);
      await this.database?.save(doc);
      count = await this.getDocumentCount();
      assert.equal(1, count);

      //validate saves worked
      const updatedDoc = await this.database?.getDocument('doc1');
      assert.equal(4, updatedDoc?.getSequence());
      assert.equal('Steve', updatedDoc?.getString('firstName'));
      assert.equal('Jobs', updatedDoc?.getString('lastName'));
      assert.equal(56, updatedDoc?.getInt('age'));

      return {
        testName: 'testCreateAndUpdateMutableDoc',
        success: true,
        message: 'success',
        data: undefined,
      };
    } catch (error) {
      return {
        testName: 'testCreateAndUpdateMutableDoc',
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
  }

  /**
   * This method tests custom conflict resolution by creating a document,
   * updating it, and then testing if the update worked based on the
   * ConcurrencyControl parameter passed in.
   *
   * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
   */
  async testSaveDocWithConflict(): Promise<ITestResult> {
    console.log(`****Starting testSaveDocWithConflict****`);
    const result1 = await this.saveDocWithConflict(
      'testSaveDocWithConflict',
      undefined
    );
    if (!result1.success) return result1;

    //reset the database
    await this.tearDown();
    await this.init();
    const result2 = await this.saveDocWithConflict(
      'testSaveDocWithConflict',
      ConcurrencyControl.FAIL_ON_CONFLICT
    );
    if (result2.success) {
      return {
        testName: 'testSaveDocWithConflict',
        success: false,
        message:
          'Expected conflict error with ConcurrencyControl.FAIL_ON_CONFLICT but did not get one',
        data: undefined,
      };
    }

    //reset the database
    await this.tearDown();
    await this.init();
    const result3 = await this.saveDocWithConflict(
      'testSaveDocWithConflict',
      ConcurrencyControl.LAST_WRITE_WINS
    );
    if (!result3.success) return result3;

    return {
      testName: 'testSaveDocWithConflict',
      success: true,
      message: 'success',
      data: undefined,
    };
  }

  async testDefaultDatabaseConfiguration(): Promise<ITestResult> {
    try {
      console.log(`****Starting testDefaultDatabaseConfiguration****`);
      const config = new DatabaseConfiguration();
      expect(config.directory).to.equal(undefined);
      expect(config.encryptionKey).to.equal(undefined);
    } catch (error) {
      return {
        testName: 'testDefaultDatabaseConfiguration',
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
    return {
      testName: 'testDefaultDatabaseConfiguration',
      success: true,
      message: 'success',
      data: undefined,
    };
  }

  async testCopyingDatabaseConfiguration(): Promise<ITestResult> {
    try {
      console.log(`****Starting testCopyingDatabaseConfiguration****`);
      const fs = new FileSystem();
      const defaultDirectory = await fs.getDefaultPath();
      const config = new DatabaseConfiguration();
      config.setDirectory(defaultDirectory);
      config.setEncryptionKey('somePassword');

      const config1 = new DatabaseConfiguration(config);
      //change the original config
      config.setDirectory('newDirectory');
      config.setEncryptionKey(undefined);

      expect(config.directory).to.not.equal(config1.directory);
      expect(config.encryptionKey).to.not.equal(config1.encryptionKey);
    } catch (error) {
      return {
        testName: 'testCopyingDatabaseConfiguration',
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
    return {
      testName: 'testCopyingDatabaseConfiguration',
      success: true,
      message: 'success',
      data: undefined,
    };
  }

  async testCopyingDatabase(): Promise<ITestResult> {
    return {
      testName: 'testCopyingDatabase',
      success: false,
      message: 'Not implemented',
      data: undefined,
    };
  }

  /**
   * This method tests running compact on a database
   *
   * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
   */
  async testPerformMaintenanceCompact(): Promise<ITestResult> {
    try {
      console.log(`****Starting testPerformMaintenanceCompact****`);
      const collection = await this.database?.defaultCollection();
      //get 5 docs to test with
      const docs = await this.createCollectionDocs('testPerformMaintenanceCompact', collection, 5);

      //update the docs 5 times
      for (const doc of docs) {
        for (let counter = 0; counter < 5; counter++) {
          doc.setValue('number', counter.toString());
          console.log(`Updating doc: ${doc.getId()} into default collection`);
          await this.collection.save(doc);
        }
      }

      //create blobs for each of the docs
      for (const doc of docs) {
        const dbDoc = await this.collection.document(doc.getId());
        const mutableDoc = MutableDocument.fromDocument(dbDoc);
        const encoder = new TextEncoder();
        const arrayBuffer = encoder.encode('hello blob');
        const blob = new Blob('text/plain', arrayBuffer);
        mutableDoc.setBlob('blob', blob);
        console.log(`Saving doc: ${doc.getId()} with blob into default collection`);
        await this.collection.save(mutableDoc);
      }

      //validate document and attachment count
      const originalDocCount = await this.collection.count();
      assert.equal(originalDocCount.count, 5);

      //compact
      console.log(`Starting last Compact`);
      await this.database?.performMaintenance(MaintenanceType.COMPACT);
      console.log(`Compact Completed`);

      //delete all the docs
      for (const doc of docs) {
        console.log(`Deleting doc: ${doc.getId()} in default collection`);
        await this.collection.deleteDocument(doc);
      }

      //validate the document and attachment count
      const postDeleteDocCount = await this.collection.count();
      assert.equal(postDeleteDocCount.count, 0);

      //compact again
      console.log(`Starting last Compact`);
      await this.database?.performMaintenance(MaintenanceType.COMPACT);

      console.log(`Last Compact completed`);
      //TODO validate the attachment count

      return {
        testName: 'testPerformMaintenanceCompact',
        success: true,
        message: 'success',
        data: undefined,
      };
    } catch (error) {
      return {
        testName: 'testPerformMaintenanceCompact',
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
  }

  /**
   * This method tests adding many documents to a database, then cleaning
   * up and trying again to validate that the init process works and the
   * database isn't the same database file.
   *
   * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
   */
  async testSaveManyDocs(): Promise<ITestResult> {
    try {
      const defaultCollection = await this.database?.defaultCollection();
      await this.createCollectionDocs('testSaveManyDocs', defaultCollection, 5000);
      let count = await defaultCollection.count();
      assert.equal(5000, count.count);
      await this.verifyCollectionDocs('testSaveManyDocs', defaultCollection, 5000);
      return {
        testName: 'testSaveManyDocs',
        success: true,
        message: 'success',
        data: undefined,
      };
    } catch (error) {
      return {
        testName: 'testSaveManyDocs',
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
  }

  /**
   * This is a helper method used to test ConcurrencyControl
   *
   * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
   */
  async saveDocWithConflict(
    methodName: string,
    control: ConcurrencyControl | undefined
  ): Promise<ITestResult> {
    try {
      console.log(`****Starting ${methodName} - saveDocWithConflict****`);
      const doc = await this.createDocumentWithId('doc1');
      doc.setString('firstName', 'Steve');
      doc.setString('lastName', 'Jobs');
      console.log(`****Saving doc 'doc1'`);
      await this.database.save(doc);

      //get two of the same document
      console.log(`****Retrieving doc1a'`);
      const doc1a = await this.database.getDocument('doc1');
      console.log(`****Retrieving doc1b'`);
      const doc1b = await this.database.getDocument('doc1');
      console.log(`****Creating mutableDoc1a`);
      const mutableDoc1a = MutableDocument.fromDocument(doc1a);
      console.log(`****Creating mutableDoc1b`);
      const mutableDoc1b = MutableDocument.fromDocument(doc1b);

      mutableDoc1a.setString('lastName', 'Wozniak');
      console.log(`****Saving mutableDoc1a`);
      await this.database.save(mutableDoc1a);

      mutableDoc1a.setString('nickName', 'The Woz');
      console.log(`****Saving mutableDoc1a`);
      await this.database.save(mutableDoc1a);

      console.log(`****Retrieving updatedDoc1a`);
      const updatedDoc1a = await this.database.getDocument('doc1');
      assert.equal('Wozniak', updatedDoc1a?.getString('lastName'));
      assert.equal('The Woz', updatedDoc1a?.getString('nickName'));
      assert.equal('Steve', updatedDoc1a?.getString('firstName'));
      assert.equal(4, updatedDoc1a?.getSequence());
      if (control === undefined) {
        console.log(`****Saving mutableDoc1b no control`);
        await this.database.save(mutableDoc1b);
      } else {
        console.log(`****Saving mutableDoc1b with control`);
        await this.database.save(mutableDoc1b, control);
      }
      console.log(`****Retrieving updatedDoc1b`);
      const updatedDoc1b = await this.database.getDocument('doc1');
      assert.equal(
        mutableDoc1b.getString('lastName'),
        updatedDoc1b.getString('lastName')
      );
      assert.equal(5, updatedDoc1b.getSequence());
      return {
        testName: methodName,
        success: true,
        message: 'success',
        data: undefined,
      };
    } catch (error) {
      return {
        testName: methodName,
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
  }

  /**
   * This method tests creating a new document then saving it to the database
   * and then opening a new database instance and verifying the document
   * was saved correctly.
   *  
   * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
   */
  async testMultipleInstances(): Promise<ITestResult> {
    try {
      let anotherDb: Database | undefined;
      let anotherCollection: any;

      const doc1a = new MutableDocument("doc1");
      doc1a.setString("name", "Scott Tiger");
      await this.defaultCollection.save(doc1a);

      anotherDb = new Database(this.databaseName, this.database.getConfig());
      const anotherDbUniqueName = await anotherDb.open();

      anotherCollection = await anotherDb.defaultCollection();

      const doc1b = await anotherCollection.document("doc1");
      console.log("Document retrieved from another database instance:", doc1b);

      expect(doc1b).to.not.be.null;
      expect(doc1b).to.not.equal(doc1a);
      expect(doc1b.getId()).to.equal(doc1a.getId());
      expect(doc1b.toDictionary()).to.deep.equal(doc1a.toDictionary());

      await anotherDb.close();
      return {
        testName: 'testMultipleInstances',
        success: true,
        message: 'success',
        data: undefined,
      };
    } catch (error) {
      return {
        testName: 'testMultipleInstances',
        success: false,
        message: JSON.stringify(error),
        data: undefined,
      };
    }
  }
}
