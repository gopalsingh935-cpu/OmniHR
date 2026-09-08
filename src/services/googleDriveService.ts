export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  shared?: boolean;
  owners?: Array<{ displayName: string; emailAddress: string; photoLink?: string }>;
  parents?: string[];
}

export interface DriveStorageQuota {
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
}

export interface DriveAboutInfo {
  user?: {
    displayName: string;
    emailAddress: string;
    photoLink?: string;
  };
  storageQuota?: DriveStorageQuota;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

export const googleDriveService = {
  /**
   * Fetch drive storage information and user profile
   */
  async getAbout(accessToken: string): Promise<DriveAboutInfo> {
    const res = await fetch(`${DRIVE_API_BASE}/about?fields=user,storageQuota`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to fetch Google Drive user details: ${res.statusText}`);
    }

    return await res.json();
  },

  /**
   * List files and folders with optional search and folder filtering
   */
  async listFiles(
    accessToken: string,
    options: {
      folderId?: string;
      searchQuery?: string;
      mimeFilter?: string;
      pageSize?: number;
      pageToken?: string;
    } = {}
  ): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> {
    const { folderId = 'root', searchQuery = '', mimeFilter = 'all', pageSize = 50, pageToken } = options;

    const queryParts: string[] = ['trashed = false'];

    // Folder navigation filter
    if (folderId && !searchQuery) {
      queryParts.push(`'${folderId}' in parents`);
    }

    // Keyword search filter (searches across file names and full text)
    if (searchQuery.trim()) {
      const safeQ = searchQuery.replace(/'/g, "\\'");
      queryParts.push(`(name contains '${safeQ}' or fullText contains '${safeQ}')`);
    }

    // MIME type filter
    if (mimeFilter === 'folders') {
      queryParts.push("mimeType = 'application/vnd.google-apps.folder'");
    } else if (mimeFilter === 'docs') {
      queryParts.push("mimeType = 'application/vnd.google-apps.document'");
    } else if (mimeFilter === 'sheets') {
      queryParts.push("mimeType = 'application/vnd.google-apps.spreadsheet'");
    } else if (mimeFilter === 'pdfs') {
      queryParts.push("mimeType = 'application/pdf'");
    } else if (mimeFilter === 'images') {
      queryParts.push("mimeType contains 'image/'");
    }

    const q = queryParts.join(' and ');
    const params = new URLSearchParams({
      q,
      pageSize: String(pageSize),
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink, webContentLink, iconLink, thumbnailLink, shared, owners, parents)',
      orderBy: 'folder,modifiedTime desc',
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const res = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to list Drive files: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      files: data.files || [],
      nextPageToken: data.nextPageToken,
    };
  },

  /**
   * Create a new folder inside Google Drive
   */
  async createFolder(
    accessToken: string,
    name: string,
    parentFolderId?: string
  ): Promise<GoogleDriveFile> {
    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId && parentFolderId !== 'root') {
      metadata.parents = [parentFolderId];
    }

    const res = await fetch(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to create folder: ${res.statusText}`);
    }

    return await res.json();
  },

  /**
   * Create a new native Google Workspace Doc or Sheet
   */
  async createGoogleDoc(
    accessToken: string,
    name: string,
    type: 'document' | 'spreadsheet',
    parentFolderId?: string
  ): Promise<GoogleDriveFile> {
    const mimeType =
      type === 'document'
        ? 'application/vnd.google-apps.document'
        : 'application/vnd.google-apps.spreadsheet';

    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name,
      mimeType,
    };

    if (parentFolderId && parentFolderId !== 'root') {
      metadata.parents = [parentFolderId];
    }

    const res = await fetch(`${DRIVE_API_BASE}/files?fields=id,name,mimeType,webViewLink`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to create Google Doc: ${res.statusText}`);
    }

    return await res.json();
  },

  /**
   * Upload an arbitrary file (PDF, image, doc, text) to Google Drive via multipart upload
   */
  async uploadFile(
    accessToken: string,
    file: File | Blob,
    fileName: string,
    mimeType: string,
    parentFolderId?: string
  ): Promise<GoogleDriveFile> {
    const metadata: { name: string; parents?: string[] } = {
      name: fileName,
    };

    if (parentFolderId && parentFolderId !== 'root') {
      metadata.parents = [parentFolderId];
    }

    const boundary = '-------EnterpriseHRMultipartBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart =
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata);

    // Convert file to ArrayBuffer or Blob
    const fileBuffer = await file.arrayBuffer();
    const preamble = `${delimiter}${metadataPart}${delimiter}Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`;
    const encoder = new TextEncoder();
    const preambleBytes = encoder.encode(preamble);
    const postambleBytes = encoder.encode(closeDelimiter);

    // Combine chunks into a single Uint8Array
    const totalLength = preambleBytes.byteLength + fileBuffer.byteLength + postambleBytes.byteLength;
    const combined = new Uint8Array(totalLength);
    combined.set(preambleBytes, 0);
    combined.set(new Uint8Array(fileBuffer), preambleBytes.byteLength);
    combined.set(postambleBytes, preambleBytes.byteLength + fileBuffer.byteLength);

    const res = await fetch(
      `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,iconLink,thumbnailLink`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: combined,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to upload file to Google Drive: ${res.statusText}`);
    }

    return await res.json();
  },

  /**
   * Delete a file or folder from Google Drive
   * (MANDATORY: Must be preceded by an explicit user confirmation dialog)
   */
  async deleteFile(accessToken: string, fileId: string): Promise<boolean> {
    const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Failed to delete file from Google Drive: ${res.statusText}`);
    }

    return true;
  },

  /**
   * Helper to format raw bytes into human readable size
   */
  formatBytes(bytesStr?: string | number): string {
    if (!bytesStr) return '0 B';
    const bytes = typeof bytesStr === 'string' ? parseInt(bytesStr, 10) : bytesStr;
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },
};
