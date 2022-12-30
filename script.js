function getid(id) {
    return document.getElementById(id);
}
function elm(name) {
    return document.createElement(name);
}

Array.prototype.lastForEach = function (callback, thisArg = this) {
    for (let i = this.length - 1; i >= 0; i--) {
        callback.call(thisArg, this[i], i, this);
    }
};

const zStack = JSON.parse(localStorage.getItem('zstack') || '[]');
function idxZStack(key) {
    return zStack.indexOf(key);
}
function pushZStack(key) {
    zStack.push(key);
}
function remZStack(key) {
    zStack.splice(idxZStack(key), 1);
}

const dragKey = 'Control';
function createNote(note, props) {
    const hnote = elm('div');
    const nInner = elm('div');
    const nHead = elm('div');
    const nMain = elm('div');
    const nTbar = elm('div');
    const nBtnRem = elm('button');
    const nBtnColl = elm('button');
    const nBtnScl = elm('button');
    const nCont = elm('div');

    hnote.className = ['note', props.classes.default, note.collapsed && props.classes.collapsed, note.scaled && props.classes.scaled].filter(Boolean).join(' ');
    nInner.className = 'note__inner';
    nHead.className = 'note__head';
    nMain.className = 'note__main';
    nTbar.className = 'note__toolbar';
    nBtnRem.className = 'note__btn note__btn--remove';
    nBtnColl.className = 'note__btn note__btn--collapse';
    nBtnScl.className = 'note__btn note__btn--scale';
    nCont.className = 'note__content';

    const setVars = ({
        x = note.x,
        y = note.y,
        z = idxZStack(props.key),
        w = note.w,
        h = note.h
    }) => hnote.style = `--x: ${x}; --y: ${y}; --z: ${z + 20}; --wid: ${w}; --hgt: ${h}`; // Reserved 20 z-indexes
    setVars({});

    hnote.addEventListener('mousedown', function () {
        remZStack(props.key);
        pushZStack(props.key);
        window.dispatchEvent(new Event('x-change-z-index'));
        window.saveNotes();
    });
    window.addEventListener('x-change-z-index', () => setVars({}));

    function isInResizeArea() {
        const compStyle = window.getComputedStyle(hnote);
        const cornerX = parseInt(compStyle.left) + parseInt(compStyle.width);
        const cornerY = parseInt(compStyle.top) + parseInt(compStyle.height);
        const areaSize = 20;
        return mouseX < cornerX && mouseX > cornerX - areaSize && mouseY < cornerY && mouseY > cornerY - areaSize;
    }
    let isInHead = false;
    let userResizing = false;
    nHead.onmouseenter = () => isInHead = true;
    nHead.onmouseleave = () => isInHead = false;
    nMain.addEventListener('mousedown', function () {
        if (!isInResizeArea()) return;
        hnote.classList.add(props.classes.resize);
        userResizing = true;
    })
    document.body.addEventListener('mouseup', function () {
        if (!userResizing) return;
        userResizing = false;
        hnote.classList.remove(props.classes.resize);
        window.saveNotes();
    });

    function dragstart(_1, ondragend) {
        if (note.scaled || !isInHead) return;
        const ix = window.mouseX;
        const iy = window.mouseY;
        let cx = note.x;
        let cy = note.y;

        function move({clientX: x, clientY: y}) {
            cx = x - ix + note.x;
            cy = y - iy + note.y;

            setVars({x: cx, y: cy});
        }
        document.body.addEventListener('mousemove', move);

        ondragend(function (node, evtype, callback) {
            node.addEventListener(evtype, function _fncurr(event) {
                callback(function () {
                    note.x = cx;
                    note.y = cy;
                    document.body.removeEventListener('mousemove', move);
                    node.removeEventListener(evtype, _fncurr);
                }, event);
                window.saveNotes();
            });
        });
    }

    nHead.addEventListener('mousedown', function (event) {
        dragstart(event, function (dropon) {
            dropon(document.body, 'mouseup', cb => cb());
        });
    });
    window.addEventListener('keydown', function (event) {
        if (event.key === dragKey) dragstart(event, function (dropon) {
            dropon(window, 'keyup', function (callback, event) {
                if (event.key === dragKey) callback();
            });
        })
    });

    [nBtnRem, nBtnColl, nBtnScl].forEach(el => el.addEventListener('mousedown', evt => evt.stopPropagation()));
    nBtnRem.addEventListener('click', function () {
        props.remcb();
    });
    nBtnColl.addEventListener('click', function () {
        note.collapsed = !note.collapsed;
        hnote.classList.toggle(props.classes.collapsed);
        window.saveNotes();
    });
    nBtnScl.addEventListener('click', function () {
        note.scaled = !note.scaled;
        hnote.classList.toggle(props.classes.scaled);
        window.saveNotes();
    });

    new ResizeObserver(function (entries) {
        if (!userResizing) return;
        const compStyle = window.getComputedStyle(entries[0].target);
        const [width, height] = [compStyle.width, compStyle.height].map(el => parseInt(el));
        if (isNaN(width) || isNaN(height)) return;
        note.w = width;
        note.h = height;
        setVars({});
    }).observe(nMain);

    nCont.setAttribute('contenteditable', true);
    nCont.innerHTML = note.content;
    nCont.oninput = function () {
        note.content = this.innerHTML;
        window.saveNotes();
    }

    hnote.append(nInner);
    nInner.append(nHead);
    nInner.append(nMain);
    nHead.append(nTbar);
    nTbar.append(nBtnRem);
    nTbar.append(nBtnColl);
    nTbar.append(nBtnScl);
    nMain.append(nCont);

    return hnote;
}
function main() {
    window.mouseX = 0;
    window.mouseY = 0;
    window.forceRemove = false;
    function _updateMousePosition({clientX: x, clientY: y}) {
        window.mouseX = x;
        window.mouseY = y;
    }
    document.body.addEventListener('mousemove', _updateMousePosition);
    document.body.addEventListener('mousedown', _updateMousePosition);
    document.body.addEventListener('mouseup', _updateMousePosition);
    window.addEventListener('keydown', function (event) {
        if (event.shiftKey && event.altKey) window.forceRemove = true;
    });
    window.addEventListener('keyup', function (event) {
        if (!event.shiftKey || !event.altKey) window.forceRemove = false;
    });

    const root = document.getElementsByClassName('root')[0];
    const notesRoot = root.getElementsByClassName('root__notes')[0];

    const _lsnotes = localStorage.getItem('notes');
    const notes = JSON.parse(_lsnotes || '[]');
    const elems = []; // DOM note-nodes list to be deleted after re-render
    window.saveNotes = function () {

        localStorage.setItem('notes', JSON.stringify(notes));
        localStorage.setItem('zstack', JSON.stringify(zStack));
    }
    function addNote(content = '', rest) {
        pushZStack(notes.length);
        notes.push({
            content,
            x: 70, y: 60,
            w: 250, h: 170,
            collapsed: false, scaled: false, ...rest
        });
        render();
    }
    if (!_lsnotes) addNote('<div>Hello! It\'s Notes App.<br></div><div>* Press Shift+N to create a new note</div><div>* You can type anything in it<br></div><div>* Drag the head with click or Ctrl key to move notes</div><div>* Drag the bottom-right corner to resize<br></div><div>* Green button to scale notes fullscreen</div><div>* Yellow button to collapse</div><div>* Red button to remove</div><div>* * (Alt/Option)+Shift+Click to ignore confirmation<br></div><div>* The app auto-saves your work :)<br></div>', {x: 118, y: 51, w: 412, h: 284});

    window.addEventListener('keydown', function (event) {
        if (event.shiftKey && event.code === 'KeyN') addNote();
    });

    function modal(node, activecls, btns) {
        const temp = [];
        btns.forEach(function (btn) {
            const hbtn = btn.$(node);
            const handler = function _fncurr() {
                btn.fn();
                temp.forEach(el => el.$.removeEventListener('click', el.fn));
            };
            hbtn.addEventListener('click', handler);
            temp.push({
                $: hbtn,
                fn: handler
            });
        });
        return function (mode) {
            node.classList.toggle(activecls, mode);
        };
    }

    function render() {
        window.saveNotes();
        elems.lastForEach(function (el) {
            el.remove();
            elems.pop();
        });
        for (let i = 0; i < notes.length; i++) {
            const item = notes[i];
            const hnote = createNote(item, {
                classes: {
                    default: 'root__note',
                    collapsed: 'root__note--collapsed',
                    scaled: 'root__note--scaled',
                    resize: 'note--resize'
                },
                remcb() {
                    function _remove() {
                        notes.splice(i, 1);
                        remZStack(notes.length);
                        render();
                    }
                    if (window.forceRemove) return _remove();
                    const cmodal = modal(document.getElementsByClassName('modal--remove-note')[0], 'root__modal--active', [
                        {
                            $: $$ => $$.getElementsByClassName('modal__button--cancel')[0],
                            fn: () => cmodal(false)
                        },
                        {
                            $: $$ => $$.getElementsByClassName('modal__button--ok')[0],
                            fn() {
                                _remove();
                                cmodal(false);
                            }
                        }
                    ]);
                    cmodal(true);
                },
                key: i
            });
            notesRoot.append(hnote);
            elems.push(hnote);
        }
    }
    render();
}

document.addEventListener('DOMContentLoaded', main);
