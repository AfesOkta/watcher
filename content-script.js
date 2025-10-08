// content-script.js
console.log("SIPD Watcher: Content script is running!");

// Function to inject a script into the page context
function injectScript(file_path, tag) {
  const node = document.getElementsByTagName(tag)[0];
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', chrome.runtime.getURL(file_path));
  node.appendChild(script);
}

// Inject the injected-script.js
injectScript('injected-script.js', 'body');

// Listen for messages from the injected script
window.addEventListener('message', (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) {
    return;
  }

  // Check the message type
  if (event.data.type === 'SIPD_AUTH_DATA') {
    console.log("SIPD Watcher (Content): Received authentication data from injected script:", event.data);
    // Send this data to the background script
    chrome.runtime.sendMessage({
      type: "SIPD_AUTH_DATA_CAPTURED",
      endpoint: event.data.endpoint,
      payload: event.data.payload
    }).then(response => {
      console.log("SIPD Watcher (Content): Background script response:", response);
    }).catch(error => {
      console.error("SIPD Watcher (Content): Error sending message to background script:", error);
    });
  }
  else if (event.data.type === 'SIPD_REFERENSI_RKUD_DATA') {
    console.log("SIPD Watcher (Content): Received RKUD data from injected script:", event.data);
    // Send this data to the background script
    chrome.runtime.sendMessage({
      type: "SIPD_RKUD_DATA_CAPTURED",
      payload: event.data.payload
    }).then(response => {
      console.log("SIPD Watcher (Content): Background script response:", response);
    }).catch(error => {
      console.error("SIPD Watcher (Content): Error sending RKUD data to background script:", error);
    });
  }
  else if (event.data.type === 'SIPD_REFERENSI_REKENING_PENGAJUAN_DATA') {
    console.log("SIPD Watcher (Content): Received Rekening Pengajuan data from injected script:", event.data);
    // Send this data to the background script
    chrome.runtime.sendMessage({
      type: "SIPD_REFERENSI_REKENING_PENGAJUAN_CAPTURED",
      payload: event.data.payload
    }).then(response => {
      console.log("SIPD Watcher (Content): Background script response:", response);
    }).catch(error => {
      console.error("SIPD Watcher (Content): Error sending Rekening Pengajuan data to background script:", error);
    });
  }
  else if (event.data.type === 'SIPD_USER_MANAGER_DATA') {
    console.log("SIPD Watcher (Content): Received data User Manager from injected script:", event.data);
    // Send this data to the background script
    chrome.runtime.sendMessage({
      type: "SIPD_USER_MANAGER_DATA_CAPTURED",
      payload: event.data.payload
    }).then(response => {
      console.log("SIPD Watcher (Content): Background script response:", response);
    }).catch(error => {
      console.error("SIPD Watcher (Content): Error sending data User Manager to background script:", error);
    });
  }
  else if (event.data.type === 'SIPD_DATA_PEGAWAI') {
    console.log("SIPD Watcher (Content): Received data Pegawai from injected script:", event.data);
    // Send this data to the background script
    chrome.runtime.sendMessage({
      type: "SIPD_DATA_PEGAWAI_CAPTURED",
      payload: event.data.payload
    }).then(response => {
      console.log("SIPD Watcher (Content): Background script response:", response);
    }).catch(error => {
      console.error("SIPD Watcher (Content): Error sending data Pegawai to background script:", error);
    });
  }
  else if (event.data.type === 'SIPD_DATA_SKPD') {
    console.log("SIPD Watcher (Content): Received data SKPD from injected script:", event.data);
    // Send this data to the background script
    chrome.runtime.sendMessage({
      type: "SIPD_DATA_SKPD_CAPTURED",
      payload: event.data.payload
    }).then(response => {
      console.log("SIPD Watcher (Content): Background script response:", response);
    }).catch(error => {
      console.error("SIPD Watcher (Content): Error sending data SKPD to background script:", error);
    });
  }
  else if (event.data.type === 'SIPD_DATA_DPA') {
    const data = event.data.payload.ringkasan;
    console.log(data);
    const payloadFilter = data.filter(item => item.kode_akun && item.kode_akun.length > 13);
    const parts = event.data.endpoint.split("/");
    const organisasiId = event.data.payload.nama_skpd;
    const tahapanId = parts[parts.length - 1];
    console.log("SIPD Watcher (Content): Received data DPA from injected script:", payloadFilter);
    // Send this data to the background script
    chrome.runtime.sendMessage({
      type: "SIPD_DATA_DPA_CAPTURED",
      payload: payloadFilter,
      tahapan: tahapanId,
      skpd: organisasiId
    }).then(response => {
      console.log("SIPD Watcher (Content): Background script response:", response);
    }).catch(error => {
      console.error("SIPD Watcher (Content): Error sending data DPA to background script:", error);
    });
  }
  else if (event.data.type === 'SIPD_DATA_JADWAL') {
    console.log("SIPD Watcher (Content): Received data Jadwal from injected script:", event.data);
    // Send this data to the background script
    chrome.runtime.sendMessage({
      type: "SIPD_DATA_JADWAL_CAPTURED",
      payload: event.data.payload
    }).then(response => {
      console.log("SIPD Watcher (Content): Background script response:", response);
    }).catch(error => {
      console.error("SIPD Watcher (Content): Error sending data Jadwal to background script:", error);
    });
  }
  else if (event.data.type === 'SIPD_DATA_CETAK_PENERIMAAN') {
    console.log("SIPD Watcher (Content): Received Cetak data from injected script:", event.data);
    chrome.runtime.sendMessage({
      type: "SIPD_DATA_CETAK_PENERIMAAN_CAPTURED",
      payload: event.data.payload
    }).then(response => {
      console.log("SIPD Watcher (Content): Background script response:", response);
    }).catch(error => {
      console.error("SIPD Watcher (Content): Error sending data Cetak to background script:", error);
    });
  }
  else if (event.data.type === 'SIPD_DATA_GET_PENYETORAN') {
    console.log("SIPD Watcher (Content): Received Sts data from injected script:", event.data);
    chrome.runtime.sendMessage({
      type: "SIPD_DATA_GET_PENYETORAN_CAPTURED",
      payload: event.data.payload
    }).then(response => {
      console.log("SIPD Watcher (Content): Background script response:", response);
    }).catch(error => {
      console.error("SIPD Watcher (Content): Error sending data Sts to background script:", error);
    });
  }
  // You can add other message types here if needed
  else if (event.data.type === 'FROM_INJECTED_SCRIPT') {
    console.log("SIPD Watcher (Content): Received generic message from injected script:", event.data.payload);
    // You could still send this data to the background script if it's relevant
    // chrome.runtime.sendMessage({ type: "GENERIC_DATA_FROM_PAGE", payload: event.data.payload });
  }
  else if (event.data.type === "GET_SIPD_TOKEN") {
    chrome.runtime.sendMessage({ action: "getSipdToken" }, (response) => {
      window.postMessage(
        { type: "SIPD_TOKEN_RESPONSE", token: response?.token || null },
        window.location.origin
      );
    });
  }
});