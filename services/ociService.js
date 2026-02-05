const common = require("oci-common");
const os = require("oci-objectstorage");

// These variables should be in your .env file
const configuration = {
    user: process.env.OCI_USER_OCID,
    fingerprint: process.env.OCI_FINGERPRINT,
    tenancy: process.env.OCI_TENANCY_OCID,
    region: common.Region[process.env.OCI_REGION],
    privateKey: process.env.OCI_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

// Check if credentials are provided
const isConfigured = !!(configuration.user && configuration.fingerprint && configuration.tenancy && configuration.privateKey);

let client = null;
if (isConfigured) {
    const provider = new common.SimpleAuthenticationDetailsProvider(
        configuration.tenancy,
        configuration.user,
        configuration.fingerprint,
        configuration.privateKey,
        null,
        configuration.region
    );
    client = new os.ObjectStorageClient({ authenticationDetailsProvider: provider });
} else {
    console.warn("OCI Service: Credentials not fully configured. Uploads will fail.");
}

const uploadToOCI = async (fileBuffer, fileName, contentType) => {
    if (!client) throw new Error("OCI Client not initialized. Check your .env variables.");

    const namespaceName = process.env.OCI_NAMESPACE;
    const bucketName = process.env.OCI_BUCKET_NAME;

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
};

const createPAR = async (objectName) => {
    if (!client) throw new Error("OCI Client not initialized.");

    const namespaceName = process.env.OCI_NAMESPACE;
    const bucketName = process.env.OCI_BUCKET_NAME;

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year expiry

    const createPreAuthenticatedRequestDetails = {
        name: `PAR_${objectName}_${Date.now()}`,
        accessType: os.models.CreatePreAuthenticatedRequestDetails.AccessType.ObjectRead,
        timeExpires: expiryDate,
        objectName: objectName
    };

    const createPreAuthenticatedRequestRequest = {
        namespaceName: namespaceName,
        bucketName: bucketName,
        createPreAuthenticatedRequestDetails: createPreAuthenticatedRequestDetails
    };

    const response = await client.createPreAuthenticatedRequest(createPreAuthenticatedRequestRequest);

    // OCI region specific endpoint
    const region = process.env.OCI_REGION.toLowerCase();
    const parUrl = `https://objectstorage.${region}.oraclecloud.com${response.preAuthenticatedRequest.accessUri}`;

    return parUrl;
};

module.exports = {
    uploadToOCI,
    isConfigured
};
