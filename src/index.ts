import * as markdownit from "markdown-it";
import * as highlightjs from "highlight.js";

import githubstyle from './githubstyle.css.js';
import atomlight from './atomlighstyle.css.js';

declare global {
    interface ShadowRoot {
        adoptedStyleSheets: CSSStyleSheet[];
    }
    interface CSSStyleSheet {
        replaceSync(cssText: string): void;
        replace(cssText: string): Promise<unknown>;
    }
}

const supportsAdoptingStyleSheets: boolean = ('adoptedStyleSheets' in Document.prototype) && ('replace' in CSSStyleSheet.prototype);

const template = document.createElement('template');
template.innerHTML = `
${ !supportsAdoptingStyleSheets ? `<style>
${ githubstyle}
${ atomlight}
</style>
` : ''}
<article class="markdown-body">
</article>
<div style="display: none;">
<slot></slot>
</div>
`

const styleSheets = [];
if (supportsAdoptingStyleSheets) {
    [githubstyle, atomlight].map((value) => {
        const stylesheet = new CSSStyleSheet();
        stylesheet.replaceSync(value);
        styleSheets.push(stylesheet);
    });
}

export class RenderMarkdown extends HTMLElement {

    static get observedAttributes() { return ['src']; }

    private _src: string = '';
    public set src(value: string) {
        this._src = value;
        this.loadExternMarkdown(value);
    }

    public get src(): string {
        return this._src;
    }

    private _md: markdownit;

    constructor() {
        super();

        this._md = markdownit({
            highlight: (str, lang) => { // inject run highlight.js over code for code highlighting
                if (lang && highlightjs.getLanguage(lang)) {
                    try {
                        return '<pre class="hljs"><code>' +
                            highlightjs.highlight(lang, str, true).value +
                            '</code></pre>';
                    } catch (__) { }
                }
                return '<pre class="hljs"><code>' + this._md.utils.escapeHtml(str) + '</code></pre>';
            },
            xhtmlOut: true,
            html: true,
        });
        this.attachShadow({ mode: 'open' });
        if (supportsAdoptingStyleSheets) {
            this.shadowRoot.adoptedStyleSheets = styleSheets;
        }
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        this.shadowRoot.querySelector('slot').addEventListener('slotchange', this.onSlotChange);
    }

    attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
        if (name === 'src') {
            this.src = newValue;
        }
    }

    onSlotChange = () => {
        if (this.textContent.trim()) {
            this.renderText(this.textContent);
        }
    }

    async loadExternMarkdown(url: string) {
        try {
            const result = await window.fetch(url);
            this.renderText(await result.text());
        } catch (e) {
            console.error(e);
        }

    }

    renderText(markdownstring: string) {
        this.shadowRoot.querySelector('article').innerHTML = this._md.render(markdownstring);
    }
}
window.customElements.define('markdown-element', RenderMarkdown);