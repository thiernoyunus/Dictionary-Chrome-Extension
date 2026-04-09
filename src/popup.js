var STORAGE_KEY = 'arabicDictionaryEnabled';
var currentEnabled = true;
var statusEl;
var toggleEl;

function setUi(enabled){
    currentEnabled = enabled;
    if(statusEl){
        statusEl.textContent = enabled ? 'Enabled on this browser' : 'Disabled on this browser';
    }
    if(toggleEl){
        toggleEl.textContent = enabled ? 'Turn off' : 'Turn on';
        toggleEl.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    }
}

function readState(){
    chrome.storage.local.get({ arabicDictionaryEnabled: true }, function(items){
        setUi(items.arabicDictionaryEnabled !== false);
    });
}

function toggleState(){
    chrome.storage.local.set({ arabicDictionaryEnabled: !currentEnabled }, function(){
        setUi(!currentEnabled);
    });
}

document.addEventListener('DOMContentLoaded', function(){
    statusEl = document.getElementById('status');
    toggleEl = document.getElementById('toggle');
    toggleEl.addEventListener('click', toggleState);
    readState();
});
