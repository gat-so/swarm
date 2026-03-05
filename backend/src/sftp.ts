import SftpClient from 'ssh2-sftp-client';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// --- Configuration ---
const VPS_HOST = process.env.VPS_HOST || 'srv1461346.hstgr.cloud';
const VPS_PORT = parseInt(process.env.VPS_PORT || '22', 10);
const VPS_USER = process.env.VPS_USER || 'root';
const VPS_SSH_KEY_PATH = (process.env.VPS_SSH_KEY_PATH || '~/.ssh/id_ed25519_vps').replace(
  '~',
  os.homedir(),
);
const VPS_SSH_PASSPHRASE = process.env.VPS_SSH_PASSPHRASE || '';
const VPS_OPENCLAW_WORKSPACE = process.env.VPS_OPENCLAW_WORKSPACE || '/docker/openclaw-bsxi/data/.openclaw/workspace';
const OPENCLAW_CONTAINER_WORKSPACE = process.env.OPENCLAW_CONTAINER_WORKSPACE || '/data/.openclaw/workspace';

/**
 * Upload a file to the VPS OpenClaw workspace via SFTP.
 * Returns the container-internal path where OpenClaw (inside Docker) will find the file.
 */
export async function uploadToVPS(
  localFilePath: string,
  remoteFileName: string,
  subdirectory?: string,
): Promise<string> {
  const sftp = new SftpClient();

  // Build host path (where the file actually goes on the VPS filesystem)
  const hostDir = subdirectory
    ? `${VPS_OPENCLAW_WORKSPACE}/${subdirectory}`
    : VPS_OPENCLAW_WORKSPACE;
  const hostPath = `${hostDir}/${remoteFileName}`;

  // Build container-internal path (what OpenClaw sees inside Docker)
  const containerDir = subdirectory
    ? `${OPENCLAW_CONTAINER_WORKSPACE}/${subdirectory}`
    : OPENCLAW_CONTAINER_WORKSPACE;
  const containerPath = `${containerDir}/${remoteFileName}`;

  try {
    // Read the SSH private key
    const privateKey = fs.readFileSync(VPS_SSH_KEY_PATH, 'utf-8');

    await sftp.connect({
      host: VPS_HOST,
      port: VPS_PORT,
      username: VPS_USER,
      privateKey,
      passphrase: VPS_SSH_PASSPHRASE || '',
    });

    // Ensure remote directory exists
    const dirExists = await sftp.exists(hostDir);
    if (!dirExists) {
      await sftp.mkdir(hostDir, true);
    }

    // Upload the file
    await sftp.put(localFilePath, hostPath);

    console.log(`[SFTP] Uploaded ${path.basename(localFilePath)} → ${hostPath} (container: ${containerPath})`);

    return containerPath;
  } catch (err) {
    console.error(`[SFTP] Upload failed for ${localFilePath}:`, err);
    throw err;
  } finally {
    await sftp.end();
  }
}

/**
 * Delete a file from the VPS OpenClaw workspace via SFTP.
 * Accepts the container-internal path (as stored in DB) and converts to host path.
 */
export async function deleteFromVPS(containerPath: string): Promise<void> {
  const sftp = new SftpClient();

  // Convert container path to host path
  const hostPath = containerPath.replace(OPENCLAW_CONTAINER_WORKSPACE, VPS_OPENCLAW_WORKSPACE);

  try {
    const privateKey = fs.readFileSync(VPS_SSH_KEY_PATH, 'utf-8');

    await sftp.connect({
      host: VPS_HOST,
      port: VPS_PORT,
      username: VPS_USER,
      privateKey,
      passphrase: VPS_SSH_PASSPHRASE || '',
    });

    const exists = await sftp.exists(hostPath);
    if (exists) {
      await sftp.delete(hostPath);
      console.log(`[SFTP] Deleted ${hostPath}`);
    }
  } catch (err) {
    console.error(`[SFTP] Delete failed for ${hostPath}:`, err);
    // Don't throw — deletion failures are non-critical
  } finally {
    await sftp.end();
  }
}

