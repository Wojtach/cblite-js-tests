import { Database, FileSystem, MutableDocument, DatabaseConfiguration, uuid, } from 'cblite';
import { assert } from 'chai';
import * as namesData from "./names_100.json";
export class TestCase {
    constructor() {
        //setup shared properties
        this.database = undefined;
        this.otherDatabase = undefined;
        this.databaseName = '';
        this.otherDatabaseName = 'otherDb';
        this.scopeName = 'testScope';
        this.collectionName = 'testCollection';
        this.collection = undefined;
        this.defaultCollection = undefined;
        this.scope = undefined;
        this.directory = undefined;
        this.dataSource = this.scopeName + '.' + this.collectionName;
        this.TEST_DOC_TAG_KEY = "TEST_TAG";
        this.TEST_DOC_SORT_KEY = "TEST_SORT_ASC";
        this.TEST_DOC_REV_SORT_KEY = "TEST_SORT_DESC";
    }
    async init() {
        var _a, _b;
        try {
            //try to get the platform local directory - can't run tests if we can't save a database to a directory
            this.databaseName = `db${uuid().toString()}`;
            //this.databaseName = `db${uuid().toString().replace(/-/g, '')}`;
            const filePathResult = await this.getPlatformPath();
            if (filePathResult.success) {
                this.directory = filePathResult.data;
            }
            else {
                return {
                    testName: 'init',
                    success: false,
                    message: filePathResult.message,
                    data: undefined,
                };
            }
            //create a database and then open it
            const databaseResult = await this.getDatabase(this.databaseName, this.directory, '');
            if (databaseResult instanceof Database) {
                this.database = databaseResult;
                await ((_a = this.database) === null || _a === void 0 ? void 0 : _a.open());
                //setup scope and collection
                this.defaultCollection = await ((_b = this.database) === null || _b === void 0 ? void 0 : _b.defaultCollection());
                this.collection = await this.database.createCollection(this.collectionName, this.scopeName);
                if (this.collection === undefined || this.defaultCollection === undefined) {
                    return {
                        testName: 'init',
                        success: false,
                        message: 'Failed to create collection',
                        data: undefined,
                    };
                }
            }
            else {
                if (typeof databaseResult === 'string') {
                    const message = databaseResult;
                    return {
                        testName: 'init',
                        success: false,
                        message: message,
                        data: undefined,
                    };
                }
            }
            return {
                testName: 'init',
                success: true,
                message: undefined,
                data: undefined,
            };
        }
        catch (error) {
            return {
                testName: 'init',
                success: false,
                message: JSON.stringify(error),
                data: undefined,
            };
        }
    }
    async tearDown() {
        if (this.database !== undefined) {
            await this.deleteDatabase(this.database);
            this.database = undefined;
            this.scope = undefined;
            this.collection = undefined;
        }
        if (this.otherDatabase !== undefined) {
            await this.deleteDatabase(this.otherDatabase);
            this.otherDatabase = undefined;
        }
    }
    async deleteDatabase(db) {
        try {
            await db.deleteDatabase();
            return {
                testName: this.constructor.name + '.deleteDatabase',
                success: true,
                message: undefined,
                data: undefined,
            };
        }
        catch (error) {
            if (error.errorMessage !== 'No such open database') {
                return {
                    testName: this.constructor.name + '.deleteDatabase',
                    success: false,
                    message: JSON.stringify(error),
                    data: undefined,
                };
            }
            else {
                return {
                    testName: this.constructor.name + '.deleteDatabase',
                    success: true,
                    message: undefined,
                    data: undefined,
                };
            }
        }
    }
    async getPlatformPath() {
        const pd = new FileSystem();
        try {
            const result = await pd.getDefaultPath();
            return {
                testName: this.constructor.name + '.getPlatformPath',
                success: true,
                message: undefined,
                data: result,
            };
        }
        catch (error) {
            return {
                testName: this.constructor.name + '.getPlatformPath',
                success: false,
                message: JSON.stringify(error),
                data: undefined,
            };
        }
    }
    async getDatabase(name, path, encryptionKey) {
        const config = new DatabaseConfiguration();
        try {
            config.directory = path !== null && path !== void 0 ? path : '';
            config.encryptionKey = encryptionKey !== null && encryptionKey !== void 0 ? encryptionKey : '';
            const db = new Database(name, config);
            return db;
        }
        catch (error) {
            return JSON.stringify(error);
        }
    }
    createDocument(id) {
        return new MutableDocument(id);
    }
    async createDocumentWithId(withId) {
        return this.createCollectionDocumentWithId(withId, this.defaultCollection);
    }
    async createCollectionDocumentWithId(withId, withCollection) {
        const doc = new MutableDocument(withId);
        doc.setValue('key', 1);
        await withCollection.save(doc);
        const savedDoc = await withCollection.document(withId);
        assert.equal(savedDoc === null || savedDoc === void 0 ? void 0 : savedDoc.getId(), withId);
        assert.equal(savedDoc === null || savedDoc === void 0 ? void 0 : savedDoc.getSequence(), 1);
        const mutableSavedDoc = MutableDocument.fromDocument(savedDoc);
        return mutableSavedDoc;
    }
    createDocumentWithIdAndData(id, data) {
        const doc = new MutableDocument(id);
        doc.setData(data);
        return doc;
    }
    createDocumentNumbered(start, end) {
        const docs = [];
        for (let counter = start; counter <= end; counter++) {
            const doc = new MutableDocument('doc-' + counter);
            doc.setNumber('number', counter);
            docs.push(doc);
        }
        return docs;
    }
    async createDocs(methodName, number) {
        var _a;
        const docs = this.createDocumentNumbered(1, number);
        try {
            for (const doc of docs) {
                await ((_a = this.database) === null || _a === void 0 ? void 0 : _a.save(doc));
            }
        }
        catch (error) {
            throw new Error(`Can't create docs: ${JSON.stringify(error)}`);
        }
        return docs;
    }
    async createCollectionDocs(methodName, withCollection, number) {
        const docs = this.createDocumentNumbered(1, number);
        try {
            for (const doc of docs) {
                await withCollection.save(doc);
            }
        }
        catch (error) {
            throw new Error(`Can't create collection docs in collection ${withCollection.name}: ${JSON.stringify(error)}`);
        }
        return docs;
    }
    createTestDoc(id, top, tag) {
        const mDoc = new MutableDocument(`doc-${id}`);
        mDoc.setValue('nullValue', null);
        mDoc.setValue('dataValue', "value");
        mDoc.setBoolean('booleanTrue', true);
        mDoc.setBoolean('booleanFalse', false);
        mDoc.setLong('longZero', 0);
        mDoc.setLong('longBig', 4000000000);
        mDoc.setLong('longSmall', -4000000000);
        mDoc.setDouble('doubleBig', 1.0E200);
        mDoc.setDouble('doubleSmall', -1.0E200);
        mDoc.setString('stringNull', null);
        mDoc.setString('stringPunk', "Jett");
        mDoc.setDate('dateNull', null);
        mDoc.setDate('dateCB', new Date('2020-01-01T00:00:00.000Z'));
        mDoc.setBlob('blobNull', null);
        mDoc.setString(this.TEST_DOC_TAG_KEY, tag);
        mDoc.setLong(this.TEST_DOC_SORT_KEY, id);
        mDoc.setLong(this.TEST_DOC_REV_SORT_KEY, top - id);
        return mDoc;
    }
    async loadDocuments(numberOfDocs) {
        await this.loadDocumentsIntoCollection(numberOfDocs, this.defaultCollection);
    }
    async loadDocumentsIntoCollection(numberOfDocs, collection) {
        await this.loadDocumentsStartStopByCollection(1, numberOfDocs, collection);
    }
    async loadDocumentsStartStopByCollection(start, stop, collection) {
        try {
            const last = start + stop - 1;
            for (let counter = start; counter <= stop; counter++) {
                let doc = this.createTestDoc(counter, last, "no-tag");
                await collection.save(doc);
            }
        }
        catch (error) {
            throw new Error(`Can't create docs: ${JSON.stringify(error)}`);
        }
    }
    async loadNamesData(collection) {
        const docs = namesData;
        let count = 0;
        for (const doc of docs['default']) {
            const mutableDoc = new MutableDocument(`doc-${count.toString()}`, null, doc);
            await collection.save(mutableDoc);
            count++;
        }
    }
    async verifyDocs(testName, number) {
        return this.verifyCollectionDocs(testName, this.defaultCollection, number);
    }
    async verifyCollectionDocs(testName, withCollection, number) {
        try {
            for (let counter = 1; counter <= number; counter++) {
                const id = 'doc-' + counter;
                const doc = await withCollection.document(id);
                const dictionary = doc.toDictionary();
                const json = JSON.stringify(dictionary);
                const verify = await this.verifyCollectionDoc(testName, id, withCollection, json);
                if (!verify.success) {
                    return verify;
                }
            }
        }
        catch (error) {
            return {
                testName: testName,
                success: false,
                message: 'failed',
                data: JSON.stringify(error),
            };
        }
        return {
            testName: testName,
            success: true,
            message: 'success',
            data: undefined,
        };
    }
    async verifyDoc(testName, withId, withData) {
        return this.verifyCollectionDoc(testName, withId, this.defaultCollection, withData);
    }
    async verifyCollectionDoc(testName, withId, withCollection, withData) {
        const doc = await withCollection.document(withId);
        if (doc === undefined && doc === null) {
            return {
                testName: testName,
                success: false,
                message: 'Document not found',
                data: undefined,
            };
        }
        else {
            if ((doc === null || doc === void 0 ? void 0 : doc.getId()) === withId &&
                JSON.stringify(doc.toDictionary) === withData) {
                return {
                    testName: testName,
                    success: true,
                    message: 'success',
                    data: undefined,
                };
            }
            else {
                return {
                    testName: testName,
                    success: false,
                    message: 'failed',
                    data: "id or data doesn't match",
                };
            }
        }
    }
    async getCollectionDocumentCount() {
        var _a;
        const queryString = `SELECT COUNT(*) as docCount FROM ${this.dataSource}`;
        const query = (_a = this.database) === null || _a === void 0 ? void 0 : _a.createQuery(queryString);
        const resultSet = await query.execute();
        if (resultSet != null) {
            return Number.parseInt(resultSet[0]['docCount']);
        }
        return 0;
    }
    async getDocumentCount() {
        var _a, _b, _c;
        const defaultCollectionName = (_a = this.defaultCollection) === null || _a === void 0 ? void 0 : _a.name;
        const defaultScopeName = (_b = this.defaultCollection) === null || _b === void 0 ? void 0 : _b.scope.name;
        const queryString = `SELECT COUNT(*) as docCount FROM ${defaultScopeName}.${defaultCollectionName}`;
        const query = (_c = this.database) === null || _c === void 0 ? void 0 : _c.createQuery(queryString);
        const resultSet = await query.execute();
        if (resultSet != null) {
            return Number.parseInt(resultSet[0]['docCount']);
        }
        return 0;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=test-case.js.map