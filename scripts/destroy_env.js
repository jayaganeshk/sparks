#!/usr/bin/env node
// Cross-platform automation script for destroying a Terraform environment for Sparks
// Usage: node scripts/destroy_env.js <env_name>

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function run(cmd, opts = {}) {
    console.log(`\n> ${cmd}`);
    const result = spawnSync(cmd, { shell: true, stdio: 'inherit', ...opts });
    if (result.status !== 0) {
        console.error(`Command failed: ${cmd}`);
        process.exit(result.status);
    }
}

function main() {
    if (process.argv.length < 3) {
        console.error('Usage: node scripts/destroy_env.js <env_name>');
        process.exit(1);
    }
    const env = process.argv[2];
    const tfEnvDir = path.join('terraform', 'environments');
    const envDir = path.join(tfEnvDir, env);
    if (!fs.existsSync(envDir)) {
        console.error(`Environment ${env} does not exist.`);
        process.exit(1);
    }

    process.chdir('terraform');
    run(`terraform init -backend-config="bucket=tf-backend-183103430916" -backend-config="key=sparks/${env}/terraform.tfstate" -backend-config="region=ap-south-1"  -reconfigure`);
    run(`terraform destroy -var-file="environments/${env}/variables.tfvars"`);
    process.chdir('..');
    console.log(`Terraform environment '${env}' destroyed. If you wish, you may now remove its folder manually.`);
}

main();
