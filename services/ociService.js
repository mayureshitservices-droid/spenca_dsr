const common = require("oci-common");
const os = require("oci-objectstorage");

// These variables should be in your .env file
const configuration = {
    user: process.env.OCI_USER_OCID?.trim(),
    fingerprint: process.env.OCI_FINGERPRINT?.trim(),
    tenancy: process.env.OCI_TENANCY_OCID?.trim(),
    region: process.env.OCI_REGION ? common.Region.fromRegionId(process.env.OCI_REGION.toLowerCase()) : null,
    privateKey: process.env.OCI_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
};

// Check if credentials are provided
const missingVars = [];
if (!process.env.OCI_USER_OCID) missingVars.push('OCI_USER_OCID');
if (!process.env.OCI_FINGERPRINT) missingVars.push('OCI_FINGERPRINT');
if (!process.env.OCI_TENANCY_OCID) missingVars.push('OCI_TENANCY_OCID');
if (!process.env.OCI_REGION) missingVars.push('OCI_REGION');
if (!process.env.OCI_PRIVATE_KEY) missingVars.push('OCI_PRIVATE_KEY');
if (!process.env.OCI_NAMESPACE) missingVars.push('OCI_NAMESPACE');
if (!process.env.OCI_BUCKET_NAME) missingVars.push('OCI_BUCKET_NAME');

const isConfigured = missingVars.length === 0;

let client = null;
if (isConfigured) {
    console.log(`OCI Service: Attempting to initialize for region: ${process.env.OCI_REGION}`);
    try {
        const provider = new common.SimpleAuthenticationDetailsProvider(
            configuration.tenancy,
            configuration.user,
            configuration.fingerprint,
            configuration.privateKey,
            null,
            configuration.region
        );
        client = new os.ObjectStorageClient({ authenticationDetailsProvider: provider });
        console.log("OCI Service: Client initialized successfully.");
    } catch (e) {
        console.error("OCI Service: Failed to initialize client:", e.message);
    }
} else {
    console.warn("OCI Service: Credentials not fully configured. Missing:", missingVars.join(', '));
}

const uploadToOCI = async (fileBuffer, fileName, contentType) => {
    if (!client) throw new Error("OCI Client not initialized. Check your .env variables.");

    const namespaceName = process.env.OCI_NAMESPACE;
    const bucketName = process.env.OCI_BUCKET_NAME;

    try {
        const putObjectRequest = {
            namespaceName: namespaceName,
            bucketName: bucketName,
            putObjectBody: fileBuffer,
            objectName: fileName,
            contentType: contentType
        };

        await client.putObject(putObjectRequest);

        // After upload, create a PAR for 1 year
        return await createPAR(fileName);
    } catch (error) {
        console.error("OCI Service: Upload error details:", error.message);
        throw error;
    }
};

const createPAR = async (objectName) => {
    if (!client) throw new Error("OCI Client not initialized.");

    const namespaceName = process.env.OCI_NAMESPACE;
    const bucketName = process.env.OCI_BUCKET_NAME;

    try {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year expiry

        const createPreauthenticatedRequestDetails = {
            name: `PAR_${objectName}_${Date.now()}`,
            accessType: "ObjectRead",
            timeExpires: expiryDate,
            objectName: objectName
        };

        const createPreauthenticatedRequestRequest = {
            namespaceName: namespaceName,
            bucketName: bucketName,
            createPreauthenticatedRequestDetails: createPreauthenticatedRequestDetails
        };

        const response = await client.createPreauthenticatedRequest(createPreauthenticatedRequestRequest);

        // OCI region specific endpoint
        const region = process.env.OCI_REGION.toLowerCase();
        const parUrl = `https://objectstorage.${region}.oraclecloud.com${response.preauthenticatedRequest.accessUri}`;

        return parUrl;
    } catch (error) {
        console.error("OCI Service: PAR creation error details:", error.message);
        throw error;
    }
};

module.exports = {
    uploadToOCI,
    isConfigured
};
