import { TestCase } from './test-case';
import { BasicAuthenticator, Replicator, ReplicatorActivityLevel, ReplicatorConfiguration, ReplicatorType, URLEndpoint } from 'cblite';
import { expect } from "chai";
/**
 * ReplicatorTests - reminder all test cases must start with 'test' in the name of the method or they will not run
 * */
export class ReplicatorTests extends TestCase {
    constructor() {
        super();
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testReplicatorConfigDefaultValues() {
        const target = new URLEndpoint('ws://localhost:4984/db');
        const config = new ReplicatorConfiguration(target);
        config.addCollection(this.collection);
        try {
            expect(config.getCollections().length).to.be.equal(1);
            expect(config.getCollections()[0][0]).to.be.equal(this.collection);
            expect(config.getReplicatorType()).to.be.equal(ReplicatorType.PUSH_AND_PULL);
            expect(config.getAcceptOnlySelfSignedCerts()).to.be.equal(ReplicatorConfiguration.defaultSelfSignedCertificateOnly);
            expect(config.getAllowReplicatingInBackground()).to.be.equal(ReplicatorConfiguration.defaultAllowReplicatingInBackground);
            expect(config.getAcceptParentDomainCookies()).to.be.equal(ReplicatorConfiguration.defaultAcceptParentDomainCookies);
            expect(config.getAutoPurgeEnabled()).to.be.equal(ReplicatorConfiguration.defaultEnableAutoPurge);
            expect(config.getContinuous()).to.be.equal(ReplicatorConfiguration.defaultContinuous);
            expect(config.getHeartbeat()).to.be.equal(ReplicatorConfiguration.defaultHeartbeat);
            expect(config.getMaxAttempts()).to.be.equal(ReplicatorConfiguration.defaultMaxAttemptsSingleShot);
            expect(config.getMaxAttemptWaitTime()).to.be.equal(ReplicatorConfiguration.defaultMaxAttemptsWaitTime);
            expect(config.getHeaders()).to.be.equal(undefined);
            expect(config.getAuthenticator()).to.be.equal(undefined);
            return {
                testName: 'testReplicatorConfigDefaultValues',
                success: true,
                message: `success`,
                data: undefined,
            };
        }
        catch (error) {
            return {
                testName: 'testReplicatorConfigDefaultValues',
                success: false,
                message: error,
                data: undefined,
            };
        }
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testEmptyPush() {
        try {
            const target = new URLEndpoint('ws://localhost:4984/db');
            //const auth = new BasicAuthenticator('user', 'password');
            const config = new ReplicatorConfiguration(target);
            config.addCollection(this.defaultCollection);
            const replicator = await Replicator.create(config);
            const token = await replicator.addChangeListener((change) => {
                const error = change.status.getError();
                if (error !== undefined) {
                    return {
                        testName: 'testEmptyPush',
                        success: false,
                        message: `Error:${error}`,
                        data: undefined,
                    };
                }
                if (change.status.getActivityLevel() === ReplicatorActivityLevel.IDLE) {
                    return {
                        testName: 'testEmptyPush',
                        success: true,
                        message: `success`,
                        data: undefined,
                    };
                }
            });
            await replicator.start(false);
            await this.sleep(10000);
            await replicator.removeChangeListener(token);
            await replicator.stop();
            return {
                testName: 'testEmptyPush',
                success: true,
                message: `success`,
                data: undefined,
            };
        }
        catch (error) {
            return {
                testName: 'testEmptyPush',
                success: false,
                message: `Error:${error}`,
                data: undefined,
            };
        }
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testStartWithCheckpoint() {
        return {
            testName: 'testStartWithCheckpoint',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testStartWithResetCheckpointContinuous() {
        return {
            testName: 'testStartWithResetCheckpointContinuous',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testDocumentReplicationEvent() {
        try {
            const target = new URLEndpoint('ws://localhost:4984/projects');
            const auth = new BasicAuthenticator('demo@example.com', 'P@ssw0rd12');
            const config = new ReplicatorConfiguration(target);
            config.addCollection(this.defaultCollection);
            config.setAuthenticator(auth);
            const replicator = await Replicator.create(config);
            const token = await replicator.addChangeListener((change) => {
                const error = change.status.getError();
                if (error !== undefined) {
                    return {
                        testName: 'testDocumentReplicationEvent',
                        success: false,
                        message: `Error:${error}`,
                        data: undefined,
                    };
                }
                if (change.status.getActivityLevel() === ReplicatorActivityLevel.IDLE) {
                    return {
                        testName: 'testDocumentReplicationEvent',
                        success: true,
                        message: `success`,
                        data: undefined,
                    };
                }
            });
            await replicator.start(false);
            await this.sleep(1000);
            const documentIds = await replicator.getPendingDocumentIds(this.defaultCollection);
            await this.sleep(10000);
            await replicator.removeChangeListener(token);
            await replicator.stop();
            const count = await this.defaultCollection.count();
            return {
                testName: 'testDocumentReplicationEvent',
                success: true,
                message: `success`,
                data: undefined,
            };
        }
        catch (error) {
            return {
                testName: 'testDocumentReplicationEvent',
                success: false,
                message: `Error:${error}`,
                data: undefined,
            };
        }
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testRemoveDocumentReplicationListener() {
        return {
            testName: 'testRemoveDocumentReplicationListener',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testDocumentReplicationEventWithPushConflict() {
        return {
            testName: 'testDocumentReplicationEventWithPushConflict',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testDocumentReplicationEventWithPullConflict() {
        return {
            testName: 'testDocumentReplicationEventWithPullConflict',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testDocumentReplicationEventWithDeletion() {
        return {
            testName: 'testDocumentReplicationEventWithDeletion',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testSingleShotPushFilter() {
        return {
            testName: 'testSingleShotPushFilter',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testContinuousPushFilter() {
        return {
            testName: 'testContinuousPushFilter',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testPullFilter() {
        return {
            testName: 'testPullFilter',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testPushAndForget() {
        return {
            testName: 'testPushAndForget',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testPullRemovedDocWithFilterSingleShot() {
        return {
            testName: 'testPullRemovedDocWithFilterSingleShot',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testPullRemovedDocWithFilterContinuous() {
        return {
            testName: 'testPullRemovedDocWithFilterContinuous',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testStopAndRestartPushReplicationWithFilter() {
        return {
            testName: 'testStopAndRestartPushReplicationWithFilter',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testStopAndRestartPullReplicationWithFilter() {
        return {
            testName: 'testStopAndRestartPullReplicationWithFilter',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testRemoveChangeListener() {
        return {
            testName: 'testRemoveChangeListener',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testAddRemoveChangeListenerAfterReplicatorStart() {
        return {
            testName: 'testAddRemoveChangeListenerAfterReplicatorStart',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testCopyingReplicatorConfiguration() {
        return {
            testName: 'testCopyingReplicatorConfiguration',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
    /**
     *
     * @returns {Promise<ITestResult>} A promise that resolves to an ITestResult object which contains the result of the verification.
     */
    async testReplicationConfigSetterMethods() {
        return {
            testName: 'testReplicationConfigSetterMethods',
            success: false,
            message: 'Not implemented',
            data: undefined,
        };
    }
}
//# sourceMappingURL=replicator-test.js.map