/**
 * Universal file downloader that works in both desktop app (PyWebView / WebView2)
 * and standard web browsers (Chrome, Edge, Firefox, etc.)
 */
export async function downloadFile({
  dataUrl = null,
  downloadUrl = null,
  content = null,
  filename = 'download',
  openFolder = false
}) {
  let serverSaved = false;
  let savedFilePath = null;

  // 1. Primary: Save directly via backend API to Windows Downloads folder
  try {
    const res = await fetch('/api/save-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data_url: dataUrl,
        source_url: downloadUrl,
        content: content,
        filename: filename,
        open_folder: openFolder
      })
    });
    if (res.ok) {
      const data = await res.json();
      serverSaved = true;
      savedFilePath = data.filepath;
    }
  } catch (err) {
    console.warn('Backend save-file notice:', err);
  }

  // 2. Secondary: Trigger browser anchor download for standard browsers
  try {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl || downloadUrl;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch (e) {}
    }, 250);
  } catch (browserErr) {
    console.warn('Browser link download notice:', browserErr);
  }

  return {
    success: true,
    serverSaved,
    savedPath: savedFilePath,
    filename: filename
  };
}

export async function openFileLocation(filename, filepath = null) {
  try {
    const res = await fetch('/api/open-file-location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, filepath })
    });
    return res.ok;
  } catch (e) {
    console.warn('Open file location error:', e);
    return false;
  }
}
