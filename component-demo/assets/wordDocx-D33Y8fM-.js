const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/docx-preview-BXBPEfL9.js","assets/chunk-CMxvf4Kt.js","assets/jszip.min-Bm_16osY.js"])))=>i.map(i=>d[i]);
import{o as e}from"./chunk-CMxvf4Kt.js";import{b as t,p as n,v as r}from"./styles-CAXI2Pzl.js";import{a as i,o as a}from"./assets-BCT_H1IV.js";import{t as o}from"./preload-helper-zJ_50EbN.js";import{i as s,n as c,r as l,t as u}from"./printLayout-C9NUCua_.js";var d={width:794,height:1123},f=2,p=12e4,m=.24,h=3,g=.15,_=9525,v=20555,y=(()=>{let e={module:null,async load(){return this.module||=o(()=>import(`./docx-preview-BXBPEfL9.js`),__vite__mapDeps([0,1,2])),this.module}};return async()=>await e.load()})(),b=e=>{if((e.byteLength>=4?new DataView(e).getUint16(0,!1):0)!==v)throw Error(`文件不是有效的 DOCX/OOXML 压缩包，可能下载不完整或被服务端错误内容替换，请重新上传或检查文件源。`)},x=(e,t,n)=>{let r=t?.options?.docx,o=e.ownerDocument.URL||void 0,s=r?.worker!==!1,c=r?.visualPagination===!0;return{debug:!1,experimental:!1,useWorker:s,workerUrl:s?a(r,o):void 0,workerJsZipUrl:s?i(r,o):void 0,workerFallback:!0,workerTimeout:r?.workerTimeout??p,renderPageBatchSize:r?.renderPageBatchSize??(r?.progressive===!1?2**53-1:f),renderYieldEveryMs:r?.renderYieldEveryMs??16,strictWordCompatibility:r?.strictWordCompatibility??!0,paginationTolerance:r?.paginationTolerance??2,breakPages:c,maxDynamicPaginationPasses:c?r?.maxDynamicPaginationPasses??1e3:0,awaitLayout:r?.awaitLayout??c,preserveComplexFieldResults:r?.preserveComplexFieldResults??!0,updatePageReferences:r?.updatePageReferences??!1,hideWebHiddenContent:r?.hideWebHiddenContent??!1,ignoreLastRenderedPageBreak:r?.ignoreLastRenderedPageBreak??!c,progress:e=>{(e.phase===`render`||e.phase===`layout`||e.phase===`done`)&&n()}}},S=e=>e.ownerDocument.defaultView,C=(e,t)=>{let n=S(t)?.HTMLElement;return n?e instanceof n:e instanceof HTMLElement},ee=e=>e?.options?.docx?.visualPagination===!0,w=`
.docx-fit-viewer {
  box-sizing: border-box;
  height: 100%;
  overflow: auto;
  background: #ececec;
}
.docx-fit-viewer .docx-wrapper {
  box-sizing: border-box;
  min-width: 0 !important;
  width: 100% !important;
  padding: 24px 14px 40px !important;
  background: #e7e9ec !important;
}
.docx-fit-viewer .docx-page-frame {
  position: relative;
  width: 100%;
  min-width: 0;
  margin: 0 auto 24px;
  overflow: visible;
}
.docx-fit-viewer .docx-flow-frame {
  position: relative;
  width: 100%;
  min-width: 0;
  margin: 0 auto 28px;
  overflow: visible;
}
.docx-fit-viewer .docx-page-frame > section.docx,
.docx-fit-viewer .docx-flow-frame > section.docx {
  position: absolute;
  top: 0;
  left: 50%;
  margin: 0 !important;
  background: #ffffff !important;
  box-shadow: 0 2px 14px rgba(25, 35, 48, 0.18);
  box-sizing: border-box;
  color: #111827;
  overflow: hidden;
  transform-origin: top center;
}
.docx-fit-viewer .docx-flow-frame > section.docx {
  height: auto !important;
  min-height: 0 !important;
  overflow: visible !important;
}
.docx-fit-viewer .docx-page-frame > section.docx > article,
.docx-fit-viewer .docx-flow-frame > section.docx > article {
  position: relative;
  z-index: 1;
}
.docx-fit-viewer .docx-vml-watermark {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.28;
  filter: saturate(0.72) brightness(1.24);
  pointer-events: none;
  user-select: none;
}
.docx-fit-viewer .docx-vml-fallback,
.docx-fit-viewer .docx-chart-fallback {
  display: block;
  max-width: 100%;
  margin: 12px auto;
  break-inside: avoid;
  page-break-inside: avoid;
}
.docx-fit-viewer .docx-vml-fallback {
  text-align: center;
}
.docx-fit-viewer .docx-vml-fallback img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}
.docx-fit-viewer .docx-chart-fallback {
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid #d7dee8;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.08);
}
.docx-fit-viewer .docx-chart-fallback svg {
  display: block;
  width: 100%;
  height: auto;
}
`;function T(e){return e.localName||e.tagName.split(`:`).pop()||e.tagName}function E(e,t){return Array.from(e.querySelectorAll(`*`)).filter(e=>T(e)===t)}function D(e,t){return E(e,t)[0]}function O(e,t,n){return(n?e.getAttributeNS(n,t):null)||e.getAttribute(t)||e.getAttribute(`r:${t}`)}function k(e){return e?(e.textContent||``).replace(/\s+/g,` `).trim():``}function A(e,t){let n=e?.parentElement||null;for(;n;){if(T(n)===t)return n;n=n.parentElement}return null}function j(e){let t=T(e)===`p`?e:A(e,`p`);if(!t)return;let n=0,r=t.previousElementSibling;for(;r;)T(r)===`p`&&(n+=1),r=r.previousElementSibling;return n}function M(e,t){let n=S(t)?.DOMParser||globalThis.DOMParser;if(!n)return null;let r=new n().parseFromString(e,`application/xml`);return r.querySelector(`parsererror`)?null:r}function N(e){let t=[];return e.split(`/`).forEach(e=>{if(!(!e||e===`.`)){if(e===`..`){t.pop();return}t.push(e)}}),t.join(`/`)}function P(e){let t=e.lastIndexOf(`/`);return t>=0?e.slice(0,t):``}function F(e){let t=P(e);return N(`${t}/_rels/${e.slice(t?t.length+1:0)}.rels`)}function I(e,t){return t.startsWith(`/`)?N(t.slice(1)):N(`${P(e)}/${t}`)}function L(e){switch(e.split(`.`).pop()?.toLowerCase()){case`png`:return`image/png`;case`jpg`:case`jpeg`:return`image/jpeg`;case`gif`:return`image/gif`;case`bmp`:return`image/bmp`;case`webp`:return`image/webp`;case`svg`:return`image/svg+xml`;default:return`application/octet-stream`}}function R(e){if(!e)return;let t=e.trim().match(/^(-?\d+(?:\.\d+)?)(px|pt|in|cm|mm)?$/i);if(!t)return;let n=Number(t[1]);if(!(!Number.isFinite(n)||n<=0))switch((t[2]||`px`).toLowerCase()){case`pt`:return n*96/72;case`in`:return n*96;case`cm`:return n*96/2.54;case`mm`:return n*96/25.4;default:return n}}function te(e){let t=new Map;return e&&e.split(`;`).forEach(e=>{let n=e.indexOf(`:`);n<=0||t.set(e.slice(0,n).trim().toLowerCase(),e.slice(n+1).trim())}),t}function ne(e){let t=te(e);return{width:R(t.get(`width`)),height:R(t.get(`height`))}}function re(e){let t=A(e,`inline`)||A(e,`anchor`),n=t?D(t,`extent`):void 0,r=Number(n?.getAttribute(`cx`)),i=Number(n?.getAttribute(`cy`));return{width:Number.isFinite(r)&&r>0?r/_:void 0,height:Number.isFinite(i)&&i>0?i/_:void 0}}async function z(e,t,n){let r=e.file(F(t)),i=new Map;if(!r)return i;let a=M(await r.async(`text`),n);return a&&E(a,`Relationship`).forEach(e=>{let t=e.getAttribute(`Id`),n=e.getAttribute(`Target`);!t||!n||i.set(t,{id:t,type:e.getAttribute(`Type`)||``,target:n,targetMode:e.getAttribute(`TargetMode`)||void 0})}),i}async function ie(e,t){let n=e.file(t);if(!n)return;let r=await n.async(`base64`);return`data:${L(t)};base64,${r}`}function ae(e){return Object.keys(e.files).filter(e=>e===`word/document.xml`||/^word\/header\d+\.xml$/i.test(e)||/^word\/footer\d+\.xml$/i.test(e)).sort((e,t)=>e===`word/document.xml`?-1:t===`word/document.xml`?1:e.localeCompare(t))}function B(e,t,n){let r=`${t?.getAttribute(`id`)||``} ${t?.getAttribute(`o:spid`)||``}`.toLowerCase(),i=(n||``).toLowerCase();return e.includes(`/header`)&&(r.includes(`watermark`)||i.includes(`z-index:-`)||i.includes(`mso-position-horizontal:center`))?`watermark`:t?.getAttribute(`o:ole`)===`t`||t?.getAttribute(`ole`)===`t`?`ole-preview`:`vml-image`}async function V(e,t){let n=[],r=new Set;for(let i of ae(e)){let a=e.file(i);if(!a)continue;let o=M(await a.async(`text`),t);if(!o)continue;let s=await z(e,i,t);for(let t of E(o,`imagedata`)){let a=O(t,`id`,`http://schemas.openxmlformats.org/officeDocument/2006/relationships`),o=a?s.get(a):void 0;if(!o||o.targetMode===`External`||!o.type.includes(`/image`))continue;let c=I(i,o.target),l=await ie(e,c);if(!l)continue;let u=A(t,`shape`),d=u?.getAttribute(`style`)||void 0,f=B(i,u,d),p=f===`watermark`?`${f}:${c}`:`${f}:${i}:${c}:${j(t)??`end`}`;r.has(p)||(r.add(p),n.push({role:f,key:p,dataUrl:l,sourcePath:c,partPath:i,title:t.getAttribute(`o:title`)||t.getAttribute(`title`)||void 0,style:d,...ne(d),paragraphIndex:i===`word/document.xml`?j(t):void 0}))}}return n}function H(e){return e?E(e,`pt`).sort((e,t)=>Number(e.getAttribute(`idx`)||0)-Number(t.getAttribute(`idx`)||0)).map(e=>k(D(e,`v`))).filter(Boolean):[]}function U(e){let t=H(D(D(e,`tx`)||e,`strCache`))[0]||H(D(D(e,`tx`)||e,`numCache`))[0]||`Series`,n=H(D(D(e,`cat`)||e,`strCache`)),r=H(D(D(e,`cat`)||e,`numCache`)),i=H(D(D(e,`val`)||e,`numCache`)).map(e=>Number(e)).filter(e=>Number.isFinite(e));return{name:t,categories:n.length?n:r,values:i}}function W(e,t,n,r){let i=[`lineChart`,`barChart`,`pieChart`,`areaChart`,`scatterChart`].map(t=>E(e,t)[0]).find(Boolean),a=i?T(i):`chart`,o=k(D(D(e,`title`)||e,`t`))||t.split(`/`).pop()||`Chart`,s=E(i||e,`ser`).map(U).filter(e=>e.values.length),{width:c,height:l}=re(n);if(s.length)return{key:`chart:${t}:${r??`end`}`,title:o,type:a,sourcePath:t,series:s,width:c,height:l,paragraphIndex:r}}async function G(e,t){let n=`word/document.xml`,r=e.file(n);if(!r)return[];let i=M(await r.async(`text`),t);if(!i)return[];let a=await z(e,n,t),o=[],s=new Set;for(let r of E(i,`chart`)){let i=O(r,`id`,`http://schemas.openxmlformats.org/officeDocument/2006/relationships`),c=i?a.get(i):void 0;if(!c||c.targetMode===`External`||!c.type.includes(`/chart`))continue;let l=I(n,c.target),u=e.file(l);if(!u)continue;let d=M(await u.async(`text`),t),f=j(r),p=d?W(d,l,r,f):void 0;!p||s.has(p.key)||(s.add(p.key),o.push(p))}return o}function K(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function q(e){let t=Math.max(360,Math.round(e.width||520)),n=Math.max(220,Math.round(e.height||320)),r={top:52,right:30,bottom:56,left:54},i=t-r.left-r.right,a=n-r.top-r.bottom,o=e.series.flatMap(e=>e.values),s=Math.max(...o,1),c=Math.min(...o,0),l=Math.max(s-c,1),u=[`#2563eb`,`#10b981`,`#f97316`,`#8b5cf6`,`#ef4444`],d=Math.max(...e.series.map(e=>e.values.length),1),f=e=>r.left+(d===1?i/2:e*i/(d-1)),p=e=>r.top+a-(e-c)/l*a,m=e.series.map((e,t)=>{let n=u[t%u.length];return`<polyline points="${e.values.map((e,t)=>`${f(t).toFixed(1)},${p(e).toFixed(1)}`).join(` `)}" fill="none" stroke="${n}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${e.values.map((t,r)=>`<circle cx="${f(r).toFixed(1)}" cy="${p(t).toFixed(1)}" r="3.5" fill="${n}"><title>${K(e.name)}: ${K(String(t))}</title></circle>`).join(``)}`}).join(``),h=(e.series.find(e=>e.categories.length)?.categories||[]).slice(0,d).map((e,t)=>{let r=f(t),i=e.length>14?`${e.slice(0,13)}...`:e;return`<text x="${r.toFixed(1)}" y="${n-22}" text-anchor="middle" fill="#64748b" font-size="11">${K(i)}</text>`}).join(``),g=e.series.slice(0,5).map((e,t)=>`<g transform="translate(${r.left+t*98} 30)"><rect width="10" height="10" rx="2" fill="${u[t%u.length]}"/><text x="15" y="9" fill="#475569" font-size="11">${K(e.name)}</text></g>`).join(``);return`<svg viewBox="0 0 ${t} ${n}" role="img" aria-label="${K(e.title)}">
    <rect x="0" y="0" width="${t}" height="${n}" rx="8" fill="#ffffff"/>
    <text x="${r.left}" y="22" fill="#0f172a" font-size="15" font-weight="700">${K(e.title)}</text>
    ${g}
    <line x1="${r.left}" y1="${r.top+a}" x2="${r.left+i}" y2="${r.top+a}" stroke="#cbd5e1"/>
    <line x1="${r.left}" y1="${r.top}" x2="${r.left}" y2="${r.top+a}" stroke="#cbd5e1"/>
    <text x="${r.left-8}" y="${r.top+4}" text-anchor="end" fill="#64748b" font-size="11">${K(s.toFixed(1))}</text>
    <text x="${r.left-8}" y="${r.top+a}" text-anchor="end" fill="#64748b" font-size="11">${K(c.toFixed(1))}</text>
    ${m}
    ${h}
  </svg>`}function oe(e){return Array.from(e.querySelectorAll(`section.docx`))}function se(e){return Array.from(e.querySelectorAll(`section.docx > article`))}function ce(e,t){if(t===void 0)return;let n=Array.from(e.querySelectorAll(`section.docx > article p`));return n[Math.min(Math.max(t,0),Math.max(n.length-1,0))]}function J(e,t,n){let r=ce(e,n);if(r){r.after(t);return}let i=se(e)[0];i&&i.appendChild(t)}function le(e,t){let n=oe(e);n.length&&t.forEach(t=>{if(t.role===`watermark`){n.forEach(n=>{let r=e.ownerDocument.createElement(`img`);r.className=`docx-vml-watermark`,r.src=t.dataUrl,r.alt=t.title||``,r.dataset.docxFallback=t.key,n.prepend(r)});return}let r=e.ownerDocument.createElement(`figure`);r.className=`docx-vml-fallback`,r.dataset.docxFallback=t.key,t.width&&(r.style.width=`${Math.round(t.width)}px`);let i=e.ownerDocument.createElement(`img`);i.src=t.dataUrl,i.alt=t.title||(t.role===`ole-preview`?`Embedded object preview`:`Document image`),t.width&&(i.style.width=`${Math.round(t.width)}px`),t.height&&(i.style.height=`${Math.round(t.height)}px`),r.appendChild(i),J(e,r,t.paragraphIndex)})}function ue(e,t){t.forEach(t=>{let n=e.ownerDocument.createElement(`figure`);n.className=`docx-chart-fallback`,n.dataset.docxFallback=t.key,t.width&&(n.style.width=`${Math.round(t.width)}px`),n.innerHTML=q(t),J(e,n,t.paragraphIndex)})}async function de(t,n){try{let{default:r}=await o(async()=>{let{default:t}=await import(`./jszip.min-Bm_16osY.js`).then(t=>e(t.t(),1));return{default:t}},__vite__mapDeps([2,1])),i=await r.loadAsync(t.slice(0)),[a,s]=await Promise.all([V(i,n),G(i,n)]);a.length&&le(n,a),s.length&&ue(n,s)}catch(e){console.warn(`[file-viewer] DOCX 兼容增强解析失败，已保留 @file-viewer/docx 原始渲染结果。`,e)}}function fe(e){let t=e.ownerDocument.createElement(`style`);return t.textContent=w,e.prepend(t),t}function Y(e,t,n){let r=e.cloneNode(!1);r.innerHTML=``,r.dataset.docxPaginated=`true`,r.style.minHeight=`${n}px`,r.style.height=`${n}px`,r.style.overflow=`hidden`;let i=t.cloneNode(!1);return r.appendChild(i),Array.from(e.children).forEach(e=>{e!==t&&r.appendChild(e.cloneNode(!0))}),{page:r,article:i}}function pe(e){let t=e.ownerDocument.defaultView?.getComputedStyle(e),n=t?parseFloat(t.minHeight):0;return Number.isFinite(n)&&n>0?n:e.offsetHeight}function me(e){let t=e.querySelector(`.docx-wrapper`);t&&Array.from(t.children).forEach(t=>{if(!C(t,e)||!t.matches(`section.docx`))return;let n=t.querySelector(`:scope > article`);if(!C(n,e))return;let r=pe(t),i=Array.from(n.childNodes);if(!r||i.length<2||t.scrollHeight<=r*1.15)return;let a=Y(t,n,r);t.before(a.page),i.forEach(e=>{a.article.appendChild(e),!(a.page.scrollHeight<=r+1||a.article.childNodes.length===1)&&(a.article.removeChild(e),a=Y(t,n,r),t.before(a.page),a.article.appendChild(e))}),t.remove()})}function he(e,t){let n=e.querySelector(`.docx-wrapper`);return n?Array.from(n.children).flatMap(n=>{if(!C(n,e)||!n.matches(`section.docx`))return[];let r=e.ownerDocument.createElement(`div`);return r.className=t?`docx-page-frame`:`docx-flow-frame`,n.before(r),r.appendChild(n),[r]}):[]}function ge(e,i){e.classList.add(`docx-fit-viewer`);let a=fe(e),o=ee(i);o&&me(e);let s=he(e,o),c=S(e),l=c?.ResizeObserver,u=0,d=1,f=1,p=1,_=n(),v=e=>Math.min(h,Math.max(m,Number(e.toFixed(2)))),y=()=>{c&&(c.cancelAnimationFrame(u),u=c.requestAnimationFrame(()=>{let t=1;s.forEach(n=>{let r=n.firstElementChild;if(!C(r,e))return;r.style.transform=`translateX(-50%)`;let i=r.offsetWidth,a=o?r.offsetHeight:Math.max(r.scrollHeight,r.offsetHeight);if(!i||!a)return;let s=Math.max(e.clientWidth-28,120),c=Math.min(1,Math.max(m,s/i)),l=v(c*d);t=l,p=c,r.style.transform=`translateX(-50%) scale(${l})`,n.style.width=`${Math.ceil(Math.max(i*l,e.clientWidth-28,120))}px`,n.style.maxWidth=`none`,n.style.height=`${Math.ceil(a*l)}px`}),f=t,_.emit()}))},b=()=>({scale:f,label:`${Math.round(f*100)}%`,canZoomIn:f<h,canZoomOut:f>m,canReset:d!==1,minScale:m,maxScale:h}),x=e=>(d=Math.min(6,Math.max(.2,Number(e.toFixed(2)))),y(),b());e.dataset.viewerZoomProvider=`docx`,r(e,{zoomIn:()=>x(d+g),zoomOut:()=>x(d-g),resetZoom:()=>x(1),setZoom:e=>x(e/Math.max(p,.01)),getState:b,subscribe:_.subscribe});let w=l?new l(y):null;return w?.observe(e),s.forEach(e=>{let t=X(e);t&&w?.observe(t)}),y(),()=>{c?.cancelAnimationFrame(u),w?.disconnect(),t(e),a.remove(),e.classList.remove(`docx-fit-viewer`)}}function X(e){let t=e.firstElementChild,n=e.ownerDocument.defaultView?.HTMLElement;return n&&t instanceof n?t:null}function Z(e){return!!e?.classList.contains(`docx-flow-frame`)}function Q(e){let t=e?X(e):null;if(!t)return d;let n=s(t,d);return Z(e)?{width:n.width,height:Math.max(t.scrollHeight||0,t.offsetHeight||0,d.height)}:n}function $(e,t){let n=Z(e),r=l(t.width),i=l(t.height);u(e,t,{heightMode:n?`min`:`fixed`}),e.style.margin=`0 auto 18px`;let a=X(e);a&&(a.style.position=`relative`,a.style.top=`auto`,a.style.left=`auto`,a.style.width=r,a.style.maxWidth=`none`,a.style.minHeight=n?`0`:i,a.style.height=n?`auto`:i,a.style.margin=`0 auto`,a.style.transform=`none`,a.style.transformOrigin=`top left`,a.style.overflow=n?`visible`:`hidden`,a.style.boxShadow=`none`)}function _e(e){let t=e.querySelector(`.docx-page-frame, .docx-flow-frame`),n=Q(t||void 0);return c({selector:t?.classList.contains(`docx-flow-frame`)?`.viewer-export-content .docx-flow-frame`:`.viewer-export-content .docx-page-frame`,width:n.width,height:t?.classList.contains(`docx-flow-frame`)?d.height:n.height,heightMode:t?.classList.contains(`docx-flow-frame`)?`min`:`fixed`})}function ve(e){let t=Array.from(e.querySelectorAll(`.docx-page-frame, .docx-flow-frame`)),n=e.cloneNode(!0),r=e.ownerDocument.createElement(`div`);r.className=`docx-print-document`;let i=Array.from(n.querySelectorAll(`style`)).filter(e=>!e.textContent?.includes(`.docx-fit-viewer`)).map(e=>e.outerHTML).join(``);return n.querySelectorAll(`.docx-page-frame, .docx-flow-frame`).forEach((e,n)=>{$(e,Q(t[n])),r.appendChild(e.cloneNode(!0))}),r.childElementCount?`${i}${r.outerHTML}`:n.innerHTML}async function ye(e,t,n){var r;b(e);let i=!1,a=()=>{var e;i||(i=!0,(e=n?.onProgressiveRender)==null||e.call(n))},o=x(t,n,a),{defaultOptions:s,renderAsync:c}=await y();t.dataset.docxWorker=o.useWorker?`self`:`false`,await c(e,t,void 0,{...s,...o}),a(),await de(e,t);let l=ge(t,n);return(r=n?.registerExportAdapter)==null||r.call(n,{includeDocumentStyles:!1,beforeSnapshot:()=>{let e=S(t);e&&e.dispatchEvent(new e.Event(`resize`))},printStyle:()=>_e(t),toHtml:()=>ve(t)}),{$el:t,unmount(){var e;(e=n?.registerExportAdapter)==null||e.call(n,null),l(),delete t.dataset.docxWorker,t.innerHTML=``}}}export{ye as default};