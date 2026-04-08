
function readFile(url){
    return new Promise(function(resolve, reject){
        var req = new XMLHttpRequest();
        req.open('GET', url);
        req.onload = function(){
            if(req.status == 200 || req.status == 0){
                resolve(req.responseText);
            }
            else{
                reject(Error(req.statusText));
            }
        };
        req.onerror = function(){
            reject(Error('Network Error'));
        };
        req.send();
    });
}

function readExtensionFile(path){
    return readFile(chrome.extension.getURL(path));
}

function DictArray(){
    this.get = function(key){
        if(key in this){
            return this[key]
        }
        return [];
    };
    this.addItem = function(key, value){
        if(!(key in this)){
            this[key] = [];
        }
        this[key].push(value);
    }
}

function createMorphTableFromFile(path){
    return new Promise(function(resolve, reject) {
        readExtensionFile(path).then(function (text) {
            createMorphTableFromText(text).then(function(table){
                resolve(table);
            });
        });
    });
}

function createMorphTableFromText(text){
    return new Promise(function(resolve, reject) {
        helper = function(){
            var lines = text.split('\n');
            var table = new DictArray();
            lines.forEach(function (line) {
                if (line != '' && line[0] != ';') {
                    elems = line.split(/\s/);
                    table.addItem(elems[0], elems[1]);
                }
            });
            resolve(table);
        }
        setTimeout(helper, 0);
    });
}

function createDictTableFromFile(path){
    return new Promise(function(resolve, reject) {
        readExtensionFile(path).then(function (text) {
            createDictTable(text).then(function(table){
                resolve(table);
            });
        });
    });
}

function createDictTable(text){
    return new Promise(function(resolve, reject) {
        helper = function(){
            var lines = text.split('\n');
            var table = new DictArray();
            var root = '---';
            lines.forEach(function (line) {
                if (line != '' && line[0] != ';') {
                    var def = {};
                    elems = line.split(/\s/);

                    def.root = root;
                    if(elems[1] == undefined){
                        console.log('bad elem: ',elems);
                    }
                    def.word = elems[1].trim();
                    def.morph = elems[2].trim();
                    meta = elems.slice(3).join(' ').split(/ <pos>|<\/pos> /);
                    def.def = meta[0].trim().split(/;/).join(', ');
                    if(meta[1] == undefined){
                        meta[1] = "";
                    }
                    def.pos = meta[1].trim();
                    table.addItem(elems[0], def);
                }
                else if(line != '' && line.trim() == ';'){
                    root = '---';
                }
                else if(line != '' && line.slice(0,5) == ';--- '){
                    root = line.split(/\s/)[1];
                }
            });
            resolve(table);
        }
        setTimeout(helper, 0);
    });
}


function detransliterate(word){
    for(var key in buck2uni){
        var newKey = key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        word = word.replace(new RegExp(newKey,"g"), buck2uni[key]);
    }
    return word;
}

function transliterate(word){
    for(var key in buck2uni){
        word = word.replace(new RegExp(buck2uni[key],"g"), key);
    }
    return word;
}

function removeDiacriticsBuckwalter(word){
    harakaat.forEach(function(h){
        word = word.replace(new RegExp(h, "g"), "");
    });
    return word;
}

var buck2uni = {
    "'": "\u0621",  // hamza-on-the-line
    "|": "\u0622",  // madda
    ">": "\u0623",  // hamza-on-'alif
    "&": "\u0624",  // hamza-on-waaw
    "<": "\u0625",  // hamza-under-'alif
    "}": "\u0626",  // hamza-on-yaa'
    "A": "\u0627",  // bare 'alif
    "b": "\u0628",  // baa'
    "p": "\u0629",  // taa' marbuuTa
    "t": "\u062A",  // taa'
    "v": "\u062B",  // thaa'
    "j": "\u062C",  // jiim
    "H": "\u062D",  // Haa'
    "x": "\u062E",  // khaa'
    "d": "\u062F",  // daal
    "*": "\u0630",  // dhaal
    "r": "\u0631",  // raa'
    "z": "\u0632",  // zaay
    "s": "\u0633",  // siin
    "$": "\u0634",  // shiin
    "S": "\u0635",  // Saad
    "D": "\u0636",  // Daad
    "T": "\u0637",  // Taa'
    "Z": "\u0638",  // Zaa' (DHaa')
    "E": "\u0639",  // cayn
    "g": "\u063A",  // ghayn
    "_": "\u0640",  // taTwiil
    "f": "\u0641",  // faa'
    "q": "\u0642",  // qaaf
    "k": "\u0643",  // kaaf
    "l": "\u0644",  // laam
    "m": "\u0645",  // miim
    "n": "\u0646",  // nuun
    "h": "\u0647",  // haa'
    "w": "\u0648",  // waaw
    "Y": "\u0649",  // 'alif maqSuura
    "y": "\u064A",  // yaa'
    "F": "\u064B",  // fatHatayn
    "N": "\u064C",  // Dammatayn
    "K": "\u064D",  // kasratayn
    "a": "\u064E",  // fatHa
    "u": "\u064F",  // Damma
    "i": "\u0650",  // kasra
    "~": "\u0651",  // shaddah
    "o": "\u0652",  // sukuun
    "`": "\u0670",  // dagger 'alif
    "{": "\u0671"   // waSla
};

var harakaat = ['a', 'u', 'i', 'F', 'N', 'K', '~', 'o'];


var uni2buck = {};
for (var key in buck2uni){
    uni2buck[buck2uni[key]] = key;
}

function lookup(word){
    //takes in arabic word, returns arabic
    word = removeDiacriticsBuckwalter(transliterate(word));
    
    var data = [];

    for(var i = 0; i < word.length; i++){
        for(var j = i + 1; j <= word.length; j++){
            var current = lookupPrefStemSuff(word.slice(0, i), word.slice(i, j), word.slice(j));
            data = data.concat(current);
        }
    }
    return data;
}

function lookupPrefStemSuff(pref, stem, suff){
    var prefMatches = dictprefs.get(pref);
    var stemMatches = dictstems.get(stem);
    var suffMatches = dictsuffs.get(suff);

    var data = [];

    var bracketify = function(word, space){

        if(word && word[0]!='['){
            if(space == 1)
                return ' [' + word + ']';
            else if(space == 2){
                return '[' + word + '] ';
            }
            else{
                return '[' + word + ']';
            }
        }
        else return '';
    };


    prefMatches.forEach(function(pref){
       stemMatches.forEach(function(stem){
           suffMatches.forEach(function(suff){
               if(isObeysGrammar(pref.morph, stem.morph, suff.morph)) {
                   var combine = {};
                  
                   combine.root = detransliterate(stem.root);
                   combine.word =
                       [detransliterate(pref.word), detransliterate(stem.word), detransliterate(suff.word)].join('');
                   
                   combine.def = [bracketify(pref.def, 2), stem.def, bracketify(suff.def, 1)].join('');
                   
                   combine.pos = [pref.pos, stem.pos, suff.pos].join(', ');
                   combine.morph = [pref.morph, stem.morph, suff.morph].join(', ');
                   data.push(combine);
               }
           });
       });
    });

    return data;
}

function isObeysGrammar(prefMorph, stemMorph, suffMorph){
    return tableab.get(prefMorph).indexOf(stemMorph) != -1
        && tablebc.get(stemMorph).indexOf(suffMorph) != -1
        && tableac.get(prefMorph).indexOf(suffMorph) != -1;
}

// Loading dictionary

var initialized = false;
var dictstems;
var dictprefs;
var dictsuffs;
var tableab;
var tablebc;
var tableac;

function loadDictData() {
    var f = [];
    f[0] = createDictTableFromFile('data/dictstems');
    f[1] = createDictTableFromFile('data/dictprefixes');
    f[2] = createDictTableFromFile('data/dictsuffixes');
    f[3] = createMorphTableFromFile('data/tableab');
    f[4] = createMorphTableFromFile('data/tablebc');
    f[5] = createMorphTableFromFile('data/tableac');
    return Promise.all(f).then(function (values) {
        dictstems = values[0];
        dictprefs = values[1];
        dictsuffs = values[2];
        tableab = values[3];
        tablebc = values[4];
        tableac = values[5];
        initialized = true;
    });

};

// injecting code
var arabicChars = "";
for(var char in uni2buck){
    arabicChars += char;
}
var arabicWordMatchRegex = new RegExp("([" + arabicChars + "]+)", "g");

function isArabicWord(text){
    return arabicWordRegex.test(text);
}

function createDefintionsHTML(data){
    var str = "";
    str += "<div class='opentip-definition-container-31245'>";
    str += "<table class='opentip-definition-table-31245'>";
    if(!data.length){
        str += "<tr>";
        str += "<td>" + "No definition found" + "</td>";
        str += "</tr>";
    }
    else {
        str += "<tr>";
        str += "<th>" + "Word" + "</th>";
        str += "<th>" + "Definition" + "</th>";
        str += "<th>" + "Root" + "</th>";
        str += "</tr>";
        data.forEach(function (entry) {
            str += "<tr>";
            str += "<td class='arabic-text-31245'>" + entry.word + "</td>";
            str += "<td>" + entry.def + "</td>";
            str += "<td class='arabic-text-31245'>" + entry.root + "</td>";
            str += "</tr>";
        });
    }
    str += "</table>";
    str += "</div>";
    return str;
}

var tooltipByElement = new WeakMap();
var tooltipListenersAttached = false;
var activeTooltip = null;
var mutationObserver = null;
var mutationBatchTimer = null;
var pendingMutationRoots = new Set();
var pendingRemovedRoots = new Set();
var suppressMutationHandling = false;

function closeTooltip(opentipInstance){
    if(!opentipInstance){
        return;
    }
    if(typeof opentipInstance.hide === 'function'){
        opentipInstance.hide();
    }
    else if(typeof opentipInstance.deactivate === 'function'){
        opentipInstance.deactivate();
    }
}

function closeAllTooltips(exceptTip){
    if(activeTooltip && activeTooltip !== exceptTip){
        closeTooltip(activeTooltip);
        activeTooltip = null;
    }
}

function attachTooltipListeners(){
    if(tooltipListenersAttached){
        return;
    }

    document.addEventListener('click', function(event){
        var clickedInsideTooltip = event.target && event.target.closest && event.target.closest('.opentip-container');
        var clickedWrappedWord = event.target && event.target.closest && event.target.closest('.arabic-wrapped-31245');
        if(!clickedInsideTooltip && !clickedWrappedWord){
            closeAllTooltips();
        }
    });

    document.addEventListener('keydown', function(event){
        if(event.key === 'Escape' || event.keyCode === 27){
            closeAllTooltips();
        }
    });

    window.addEventListener('scroll', function(){
        closeAllTooltips();
    }, true);

    window.addEventListener('resize', function(){
        closeAllTooltips();
    });

    tooltipListenersAttached = true;
}

function shouldSkipTextNode(textNode){
    if(!textNode || !textNode.parentNode || !textNode.nodeValue){
        return true;
    }
    if(!textNode.parentElement){
        return false;
    }
    if(textNode.parentElement.closest('.arabic-wrapped-31245, .opentip-container')){
        return true;
    }
    var tagName = textNode.parentElement.tagName;
    return tagName == 'SCRIPT'
        || tagName == 'STYLE'
        || tagName == 'NOSCRIPT'
        || tagName == 'TEXTAREA';
}

function createWrappedSpan(arabicWord){
    var wrapped = document.createElement('span');
    wrapped.className = 'arabic-wrapped-31245';
    wrapped.textContent = arabicWord;
    return wrapped;
}

function addTooltipForElement(elem){
    if(!elem || tooltipByElement.has(elem)){
        return;
    }
    if(extensionState !== EXTENSION_STATES.READY){
        elem.setAttribute('title', 'Dictionary data failed to load. Reload this page to retry.');
        return;
    }

    var tip = new Opentip(elem, createDefintionsHTML(lookup(elem.textContent)), {
        style: 'glass'
    });

    var originalShow = tip.show;
    tip.show = function(){
        closeAllTooltips(this);
        activeTooltip = this;
        return originalShow.apply(this, arguments);
    };

    if(typeof tip.hide === 'function'){
        var originalHide = tip.hide;
        tip.hide = function(){
            if(activeTooltip === this){
                activeTooltip = null;
            }
            return originalHide.apply(this, arguments);
        };
    }

    if(typeof tip.deactivate === 'function'){
        var originalDeactivate = tip.deactivate;
        tip.deactivate = function(){
            if(activeTooltip === this){
                activeTooltip = null;
            }
            return originalDeactivate.apply(this, arguments);
        };
    }

    tooltipByElement.set(elem, tip);
}

function disposeTooltipForElement(elem){
    if(!elem){
        return;
    }
    var tip = tooltipByElement.get(elem);
    if(tip){
        closeTooltip(tip);
        if(tip.container && tip.adapter){
            tip.adapter.remove(tip.container);
        }
    }
    tooltipByElement.delete(elem);
}

function cleanupRemovedNode(node){
    if(!node || node.nodeType !== Node.ELEMENT_NODE){
        return;
    }
    if(node.classList && node.classList.contains('arabic-wrapped-31245')){
        disposeTooltipForElement(node);
    }
    var removedWrapped = node.querySelectorAll('.arabic-wrapped-31245');
    for(var i = 0; i < removedWrapped.length; i++){
        disposeTooltipForElement(removedWrapped[i]);
    }
}

function ensureTooltipForWrappedSubtree(node){
    if(!node || node.nodeType !== Node.ELEMENT_NODE){
        return;
    }

    if(node.classList && node.classList.contains('arabic-wrapped-31245')){
        addTooltipForElement(node);
    }

    var wrappedNodes = node.querySelectorAll('.arabic-wrapped-31245');
    for(var i = 0; i < wrappedNodes.length; i++){
        addTooltipForElement(wrappedNodes[i]);
    }
}

function wrapArabicWordsInTextNode(textNode){
    if(shouldSkipTextNode(textNode)){
        return;
    }
    var text = textNode.nodeValue;
    arabicWordMatchRegex.lastIndex = 0;
    if(!arabicWordMatchRegex.test(text)){
        return;
    }
    var frag = document.createDocumentFragment();
    arabicWordMatchRegex.lastIndex = 0;
    var lastIndex = 0;
    var match;
    while((match = arabicWordMatchRegex.exec(text)) !== null){
        if(match.index > lastIndex){
            frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        var wrapped = createWrappedSpan(match[0]);
        frag.appendChild(wrapped);
        addTooltipForElement(wrapped);
        lastIndex = arabicWordMatchRegex.lastIndex;
    }
    if(lastIndex < text.length){
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    textNode.parentNode.replaceChild(frag, textNode);
}

function isNodeConnected(node){
    if(!node){
        return false;
    }
    if(node === document || node === document.documentElement){
        return true;
    }
    if(node.nodeType === Node.TEXT_NODE){
        return !!node.parentNode && !!node.parentNode.isConnected;
    }
    return !!node.isConnected;
}

function processNodeForArabicWords(node){
    if(!node){
        return;
    }
    if(!isNodeConnected(node)){
        return;
    }
    if(node.nodeType === Node.TEXT_NODE){
        wrapArabicWordsInTextNode(node);
        return;
    }
    if(node.nodeType !== Node.ELEMENT_NODE){
        return;
    }
    if(node.closest && node.closest('.opentip-container')){
        return;
    }
    if(node.classList && node.classList.contains('arabic-wrapped-31245')){
        addTooltipForElement(node);
        return;
    }
    if(node.classList && node.classList.contains('opentip-container')){
        return;
    }

    ensureTooltipForWrappedSubtree(node);

    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    var curElem;
    while(curElem = walker.nextNode()){
        textNodes.push(curElem);
    }
    textNodes.forEach(function(textNode){
        wrapArabicWordsInTextNode(textNode);
    });
}

function flushMutationBatch(){
    mutationBatchTimer = null;
    var nodesToProcess = Array.from(pendingMutationRoots);
    pendingMutationRoots.clear();
    var nodesToCleanup = Array.from(pendingRemovedRoots);
    pendingRemovedRoots.clear();

    suppressMutationHandling = true;
    if(mutationObserver){
        mutationObserver.disconnect();
    }

    nodesToCleanup.forEach(function(node){
        if(!isNodeConnected(node)){
            cleanupRemovedNode(node);
        }
    });

    nodesToProcess.forEach(function(node){
        if(isNodeConnected(node)){
            processNodeForArabicWords(node);
        }
    });

    if(mutationObserver){
        mutationObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    suppressMutationHandling = false;
}

function scheduleMutationBatch(node){
    if(!node){
        return;
    }
    pendingMutationRoots.add(node);
    if(mutationBatchTimer){
        return;
    }
    mutationBatchTimer = setTimeout(flushMutationBatch, 60);
}

function startMutationObserver(){
    if(mutationObserver){
        return;
    }
    mutationObserver = new MutationObserver(function(mutations){
        if(suppressMutationHandling){
            return;
        }
        mutations.forEach(function(mutation){
            if(mutation.type === 'childList'){
                for(var i = 0; i < mutation.removedNodes.length; i++){
                    pendingRemovedRoots.add(mutation.removedNodes[i]);
                }
                for(var j = 0; j < mutation.addedNodes.length; j++){
                    scheduleMutationBatch(mutation.addedNodes[j]);
                }
                if(mutation.removedNodes.length && !mutationBatchTimer){
                    mutationBatchTimer = setTimeout(flushMutationBatch, 60);
                }
            }
            else if(mutation.type === 'characterData'){
                scheduleMutationBatch(mutation.target);
            }
        });
    });
    mutationObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

function wrapArabicWords(){
    // initial full-page wrapping pass
    processNodeForArabicWords(document.documentElement);
}

function initialize(){
    loadDictData().then(function(){
        if(extensionState === EXTENSION_STATES.READY){
            setTimeout(function(){
                Opentip.lastZIndex = 1000000000;
                attachTooltipListeners();
                wrapArabicWords();
                startMutationObserver();
            }, 0);
        }
    }).catch(function(){
        console.warn('Dictionary extension is in error state. Native title tooltips will be used until dictionary data loads successfully.');
        wrapArabicWords();
    });
}


initialize();


//TODO clear css (esp spans), figure out gloss, make update dynamic (e.g. youtube)
//TODO bug in roots
//TODO escape html
