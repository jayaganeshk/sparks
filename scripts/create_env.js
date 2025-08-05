#!/usr/bin/env node
// Cross-platform automation script for creating new Terraform and webUI environments for Sparks
// Usage: node scripts/create_env.js <env_name> [amplify_app_id]

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// Import AWS SDK for Amplify deployment
try {
    // Use dynamic import to handle potential missing dependencies gracefully
    var { AmplifyClient, CreateDeploymentCommand, StartDeploymentCommand } = require('@aws-sdk/client-amplify');
    var axios = require('axios');
} catch (err) {
    console.log("err", err)
    console.log('AWS SDK dependencies not found. Amplify deployment will be skipped.');
    console.log('To enable Amplify deployment, run: npm install @aws-sdk/client-amplify axios --save');
}

function copyAndReplaceVars(src, dest, oldEnv, newEnv) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    const srcFile = path.join(src, 'variables.tfvars');
    const destFile = path.join(dest, 'variables.tfvars');
    let content = fs.readFileSync(srcFile, 'utf8');
    content = content.replace(new RegExp(oldEnv, 'g'), newEnv);
    fs.writeFileSync(destFile, content);
}

function run(cmd, opts = {}) {
    console.log(`\n> ${cmd}`);
    const result = spawnSync(cmd, { shell: true, stdio: 'inherit', ...opts });
    if (result.status !== 0) {
        console.error(`Command failed: ${cmd}`);
        process.exit(result.status);
    }
}

async function checkBranchExists(client, appId, branchName) {
    try {
        // Import the GetBranchCommand
        const { GetBranchCommand } = require('@aws-sdk/client-amplify');
        
        // Try to get the branch
        const getBranchCommand = new GetBranchCommand({
            appId: appId,
            branchName: branchName
        });
        
        await client.send(getBranchCommand);
        return true; // Branch exists
    } catch (error) {
        if (error.name === 'NotFoundException') {
            return false; // Branch doesn't exist
        }
        throw error; // Re-throw other errors
    }
}

async function deployToAmplify(appId, branchName, zipFilePath) {
    if (!AmplifyClient || !axios) {
        console.log('AWS SDK dependencies not available. Skipping Amplify deployment.');
        return false;
    }

    console.log(`\nDeploying to AWS Amplify app: ${appId}, branch: ${branchName}`);

    try {
        // Initialize the Amplify client with the region
        const REGION = "ap-south-1"; // Using the same region as in Terraform
        const client = new AmplifyClient({ region: REGION });
        
        // Check if the branch exists
        const branchExists = await checkBranchExists(client, appId, branchName);
        if (!branchExists) {
            console.log(`\nBranch '${branchName}' does not exist in Amplify app ${appId}.`);
            console.log(`Please create the branch first using the AWS Console or CLI:`);
            console.log(`aws amplify create-branch --app-id ${appId} --branch-name ${branchName}`);
            return false;
        }
        
        console.log(`Branch '${branchName}' exists, proceeding with deployment...`);

        // Step 1: Request upload URLs from Amplify
        console.log('Creating deployment and requesting upload URL...');
        const createDeployment = new CreateDeploymentCommand({
            appId: appId,
            branchName: branchName,
        });
        
        const deploymentRes = await client.send(createDeployment);
        
        // Extract job ID and upload URL
        const { jobId, zipUploadUrl } = deploymentRes;
        
        if (!zipUploadUrl) {
            throw new Error('No zipUploadUrl found in the deployment response');
        }
        
        // Step 2: Upload the ZIP file using the provided signed URL
        console.log('Uploading ZIP file to Amplify...');
        const fileData = fs.readFileSync(zipFilePath);
        await axios.put(zipUploadUrl, fileData, {
            headers: { "content-type": "application/zip" },
            maxBodyLength: Infinity, // Allow large file uploads
            maxContentLength: Infinity
        });

        // Step 3: Start the deployment
        console.log('Starting Amplify deployment...');
        const startDeployment = new StartDeploymentCommand({
            appId: appId,
            branchName: branchName,
            jobId,
        });
        await client.send(startDeployment);

        console.log('Deployment started and ZIP uploaded successfully.');
        return true;
    } catch (err) {
        if (err.name === 'BadRequestException') {
            console.error(`Amplify deployment failed: Bad request - ${err.message}`);
            console.error('This could be due to an issue with the branch configuration or deployment settings.');
        } else if (err.name === 'ResourceNotFoundException') {
            console.error(`Amplify deployment failed: Resource not found - ${err.message}`);
            console.error('This could be because the app ID or branch name is incorrect.');
        } else if (err.name === 'LimitExceededException') {
            console.error(`Amplify deployment failed: Limit exceeded - ${err.message}`);
            console.error('You may have reached the maximum number of deployments allowed.');
        } else {
            console.error(`Amplify deployment failed: ${err.name} - ${err.message}`);
        }
        
        // Provide guidance on how to create a branch if needed
        console.log('\nTo create a branch in Amplify, run:');
        console.log(`aws amplify create-branch --app-id ${appId} --branch-name ${branchName}`);
        
        return false;
    }
}

async function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node scripts/create_env.js <env_name> [amplify_app_id]');
        process.exit(1);
    }
    const env = process.argv[2];
    const amplifyAppId = process.argv[3];
    const tfEnvDir = path.join('terraform', 'environments');
    const devDir = path.join(tfEnvDir, 'dev');
    const newDir = path.join(tfEnvDir, env);
    if (!fs.existsSync(newDir)) {
        console.log(`Creating new environment folder: ${newDir}`);
        copyAndReplaceVars(devDir, newDir, 'dev', env);
    } else {
        console.log(`Environment ${env} already exists, updating variables...`);
        const srcFile = path.join(newDir, 'variables.tfvars');
        let content = fs.readFileSync(srcFile, 'utf8');
        content = content.replace(new RegExp('dev', 'g'), env);
        fs.writeFileSync(srcFile, content);
    }

    // Terraform commands
    process.chdir('terraform');
    run(`terraform init -backend-config="bucket=tf-backend-183103430916" -backend-config="key=sparks/${env}/terraform.tfstate" -backend-config="region=ap-south-1"  -reconfigure`);
    run(`terraform plan -var-file="environments/${env}/variables.tfvars" -out="tf-output"`);
    run(`terraform apply "tf-output"`);

    // Get terraform output as env vars
    let tfOut = execSync('terraform output -json').toString();
    let tfOutputs = {};
    try {
        tfOutputs = JSON.parse(tfOut);
    } catch (e) {
        console.error('Failed to parse terraform output:', e);
        process.exit(1);
    }

    // Extract CloudFront distribution IDs if available
    const uiDistributionId = tfOutputs.cloudfront_ui_distribution_id?.value || tfOutputs.ui_distribution_id?.value;
    const imageDistributionId = tfOutputs.image_distribution_id?.value;

    process.chdir('..');

    // Write webUI env file using template and terraform outputs
    const webuiEnvFile = path.join('webUI', `.env.${env}`);

    // Create the env file content
    const envContent = `# API Configuration
VITE_API_BASE_URL=https://api.${env}.sparks.deonte.in

# AWS Cognito Configuration
VITE_AWS_REGION=ap-south-1
VITE_USER_POOL_ID=${tfOutputs.cognito_user_pool_id?.value}
VITE_USER_POOL_WEB_CLIENT_ID=${tfOutputs.cognito_app_client_id?.value}
VITE_IDENTITY_POOL_ID=${tfOutputs.cognito_identity_pool_id?.value}

# AWS API Gateway Configuration
VITE_API_ENDPOINT=https://api.${env}.sparks.deonte.in


# Other Configuration
VITE_BATCH_UPLOAD_LIMIT=10
`;

    fs.writeFileSync(webuiEnvFile, envContent);
    console.log(`Updated ${webuiEnvFile} with Terraform outputs`);

    // Build webUI
    process.chdir('webUI');
    run(`npm install`); // ensure deps
    run(`npm run build -- --mode ${env}`);

    // Zip dist folder
    const distPath = path.join('dist');
    const zipName = `${env}.zip`;

    // Different zip approach for Windows vs Linux
    if (process.platform === 'win32') {
        // First, remove any existing zip file
        const zipPath = path.join(distPath, zipName);
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }

        // Use a simpler PowerShell approach - list all files and directories explicitly
        const currentDir = process.cwd();
        process.chdir(distPath);

        // Get all files and directories in the dist folder
        const items = fs.readdirSync('.');

        // Create a comma-separated list of items for PowerShell
        const itemsList = items
            .filter(item => item !== zipName) // Exclude the zip file itself
            .map(item => `'./${item}'`)
            .join(', ');

        // Use PowerShell to zip the files
        if (itemsList) {
            run(`powershell -Command "Compress-Archive -Path ${itemsList} -DestinationPath './${zipName}' -Force"`);
        } else {
            console.error('No files found to zip');
        }

        process.chdir(currentDir);
    } else {
        // Linux zip command - change directory to dist and zip contents
        const currentDir = process.cwd();
        process.chdir(distPath);
        run(`zip -r ${zipName} ./*`);
        process.chdir(currentDir);
    }

    console.log(`Zipped dist to dist/${zipName}`);

    // Get Amplify App ID from Terraform outputs if not provided as parameter
    let amplifyAppIdToUse = amplifyAppId;
    if (!amplifyAppIdToUse && tfOutputs.amplify_app_id?.value) {
        amplifyAppIdToUse = tfOutputs.amplify_app_id.value;
        console.log(`\nFound Amplify App ID in Terraform outputs: ${amplifyAppIdToUse}`);
    }

    // Deploy to AWS Amplify if app ID is available
    // Always use 'prod' as the branch name for Amplify deployments
    const branchName = 'prod';
    if (amplifyAppIdToUse) {
        const zipPath = path.join(process.cwd(), 'dist', zipName);
        await deployToAmplify(amplifyAppIdToUse, branchName, zipPath);
    } else {
        console.log('\nNo Amplify app ID provided or found in Terraform outputs, skipping deployment');
        console.log('To deploy manually with AWS SDK, run:');
        console.log(`node -e "const { AmplifyClient, CreateDeploymentCommand, StartDeploymentCommand } = require('@aws-sdk/client-amplify'); const axios = require('axios'); const fs = require('fs'); (async () => { const client = new AmplifyClient({ region: 'ap-south-1' }); const createRes = await client.send(new CreateDeploymentCommand({ appId: 'YOUR_AMPLIFY_APP_ID', branchName: 'prod' })); await axios.put(createRes.fileUploadUrls.file, fs.readFileSync('${path.join(process.cwd(), 'dist', zipName)}'), { headers: { 'content-type': 'application/zip' }, maxBodyLength: Infinity, maxContentLength: Infinity }); await client.send(new StartDeploymentCommand({ appId: 'YOUR_AMPLIFY_APP_ID', branchName: 'prod', jobId: createRes.jobId })); console.log('Deployment complete!'); })().catch(console.error);"`);
    }

    // Invalidate CloudFront cache if distribution IDs are available
    if (uiDistributionId) {
        console.log(`\nInvalidating CloudFront UI distribution: ${uiDistributionId}`);
        try {
            run(`aws cloudfront create-invalidation --distribution-id ${uiDistributionId} --paths "/*"`);
            console.log(`Successfully created invalidation for UI distribution ${uiDistributionId}`);
        } catch (error) {
            console.error(`Failed to invalidate CloudFront UI distribution: ${error.message}`);
        }
    } else {
        console.log('\nNo CloudFront UI distribution ID found in Terraform outputs, skipping invalidation');
        console.log('To add CloudFront UI distribution ID to Terraform outputs, make sure the cloudfront_ui_distribution_id output is defined.');
    }

    if (imageDistributionId) {
        console.log(`\nInvalidating CloudFront image distribution: ${imageDistributionId}`);
        try {
            run(`aws cloudfront create-invalidation --distribution-id ${imageDistributionId} --paths "/*"`);
            console.log(`Successfully created CloudFront invalidation for image distribution`);
        } catch (error) {
            console.error(`Failed to invalidate CloudFront image distribution: ${error.message}`);
        }
    }

    console.log('\nEnvironment creation and deployment complete!');
}

// Call main function and handle any unhandled promise rejections
main().catch(err => {
    console.error('Error in main function:', err);
    process.exit(1);
});
