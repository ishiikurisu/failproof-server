// #####################
// # MEMORY MANAGEMENT #
// #####################

/**
 * Loads checklists from memory
 * @returns a list of checklist objects
 */
function loadChecklists() {
    var rawChecklists = localStorage.getItem('checklists');
    var checklists = [];

    if (!!rawChecklists) {
        checklists = JSON.parse(rawChecklists);
    }

    return checklists;
}

/**
 * Creates a dummy checklist. Should be used as template for remaining
 * checklists
 */
function createDummyChecklist() {
    return {
        "title": "Your first checklist",
        "items": [
            {
                "kind": "todo",
                "title": "To do item",
                "done": false
            }, {
                "kind": "todo",
                "title": "Done item",
                "done": true
            }
        ]
    }
}

/**
 * Saves checklists on local storage
 * @param checklists list of checklist objects
 */
function saveChecklists(checklists) {
    localStorage.setItem('checklists', JSON.stringify(checklists));

    // syncing last updated cookie
    var request = new XMLHttpRequest();
    request.open('GET', `https://fpcl.herokuapp.com/now`, true);
    request.onload = function() {
        if (this.status >= 200 && this.status < 400) {
            var response = JSON.parse(this.response);
            setCookie('last_updated', response.now);
        }
    }
    request.send();
}

// ##################
// # API MANAGEMENT #
// ##################

/* FPCL TO CHECKLISTS */

/**
 * Converts list of checklists as JS objects into a *.fpcl string
 * @param checklists array of checklists
 * @returns a string representing the checklist in the *.fpcl format
 */
function checklistsToFpcl(checklists) {
    var outlet = "";
    var listBreak = "";

    for (var i = 0; i < checklists.length; i++) {
        var checklist = checklists[i];
        var items = checklist.items;
        var box = `# ${decodeURIComponent(checklist.title)}\n\n`;
        for (var j = 0; j < items.length; j++) {
            var item = items[j];
            switch (item.kind) {
                case "note":
                    box += `${decodeURIComponent(item.title)}\n`;
                    break;
                case "todo":
                    var checked = `- [${(item.done)? "x" : " "}] `;
                    box += `${checked}${decodeURIComponent(item.title)}\n`;
                    break;

            }
        }
        outlet += `${listBreak}${box}`;
        listBreak = "\n";
    }

    return outlet;
}

/* FPCL TO CHECKLISTS */

function identifyKind(line) {
    let kinds = [
        {
            name: 'title',
            regex: /^#(.*)/
        },
        {
            name: 'todo',
            regex: /^- \[[\sx]\](.*)/
        },
        {
            name: 'empty',
            regex: /^(?![\s\S])/
        }
    ];
    var noKind = kinds.length;
    for (var i = 0; i < noKind; i++) {
        var kind = kinds[i];
        var match = line.match(kind.regex);
        if (match) {
            return kind.name;
        }
    }
    return 'note';
}

/**
 * Converts a markdown string into an array of checklists
 * @param md string representation of a checklist
 * @returns array of checklists
 */
function fpclToChecklists(md) {
    var checklists = [];
    var lines = ((md[md.length - 1] !== '\n')? md + "\n" : md).split('\n');
    var currentChecklist = null;
    var currentState = "title";

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        currentState = identifyKind(line);

        switch (currentState) {
            case 'title':
                if (currentChecklist !== null) {
                    checklists.push(currentChecklist);
                }

                currentChecklist = {
                    'title': encodeURIComponent(line.substring(1).trim()),
                    'items': []
                };
                break;

            case 'todo':
                currentChecklist.items.push({
                    'kind': 'todo',
                    'title': encodeURIComponent(line.substring('- [ ]'.length).trim()),
                    'done': !!line.match(/^- \[x\]/)
                });
                break;

            case 'note':
                currentChecklist.items.push({
                    'kind': 'note',
                    'title': encodeURIComponent(line.trim())
                });
                break;

            default:
                // empty line
                continue;
        }
    }

    if (currentState !== 'title') {
        checklists.push(currentChecklist);
    }

    return checklists;
}
