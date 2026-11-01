// Google Picker API Helper Service

export interface SelectedDriveFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  iconUrl?: string;
  sizeBytes?: number;
  lastEditedUtc?: number;
  description?: string;
}

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

let isGapiLoading = false;
let gapiLoadPromise: Promise<void> | null = null;

/**
 * Ensures Google API script (https://apis.google.com/js/api.js) and the 'picker' module are loaded.
 */
export async function loadGooglePickerApi(): Promise<void> {
  if (window.google?.picker) {
    return Promise.resolve();
  }

  if (gapiLoadPromise) {
    return gapiLoadPromise;
  }

  gapiLoadPromise = new Promise<void>((resolve, reject) => {
    const loadPickerModule = () => {
      if (window.gapi) {
        window.gapi.load('picker', {
          callback: () => {
            resolve();
          },
          onerror: () => {
            reject(new Error('Failed to load Google Picker module via gapi'));
          },
        });
      } else {
        reject(new Error('window.gapi unavailable after script load'));
      }
    };

    if (window.gapi) {
      loadPickerModule();
    } else {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        loadPickerModule();
      };
      script.onerror = () => {
        reject(new Error('Failed to load https://apis.google.com/js/api.js script'));
      };
      document.body.appendChild(script);
    }
  });

  return gapiLoadPromise;
}

/**
 * Open Google Picker dialog to select files or upload files from Google Drive
 */
export async function openGooglePicker({
  accessToken,
  onPicked,
  onCancel,
}: {
  accessToken: string;
  onPicked: (file: SelectedDriveFile) => void;
  onCancel?: () => void;
}): Promise<void> {
  await loadGooglePickerApi();

  if (!window.google?.picker) {
    throw new Error('Google Picker API script is not ready');
  }

  const pickerOrigin =
    window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
      ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
      : window.location.origin;

  // Configure views: Documents view & Upload view
  const docsView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS);
  docsView.setIncludeFolders(true);

  const uploadView = new window.google.picker.DocsUploadView();

  const picker = new window.google.picker.PickerBuilder()
    .addView(docsView)
    .addView(uploadView)
    .setOAuthToken(accessToken)
    .setOrigin(pickerOrigin)
    .setCallback((data: any) => {
      if (data.action === window.google.picker.Action.PICKED) {
        const doc = data.docs[0];
        if (doc) {
          const file: SelectedDriveFile = {
            id: doc.id,
            name: doc.name,
            url: doc.url || doc.embedUrl || `https://drive.google.com/file/d/${doc.id}/view`,
            mimeType: doc.mimeType || 'application/octet-stream',
            iconUrl: doc.iconUrl,
            sizeBytes: doc.sizeBytes,
            lastEditedUtc: doc.lastEditedUtc,
            description: doc.description,
          };
          onPicked(file);
        }
      } else if (data.action === window.google.picker.Action.CANCEL) {
        if (onCancel) onCancel();
      }
    })
    .build();

  picker.setVisible(true);
}
