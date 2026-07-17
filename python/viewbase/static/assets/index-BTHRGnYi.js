(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function t(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(r){if(r.ep)return;r.ep=!0;const i=t(r);fetch(r.href,i)}})();const mh=1;function gh(){return{type:"hello",protocol:mh}}function lo(s){return JSON.stringify(s)}function _h(s){const e=JSON.parse(s);if(!e||typeof e!="object"||!e.type)throw new Error("Neplatná zpráva protokolu");return e}class vh{constructor(e,t,{WebSocketImpl:n=globalThis.WebSocket,schedule:r=(c,h)=>setTimeout(c,h),minBackoff:i=500,maxBackoff:a=1e4,onStatus:o=()=>{},onAction:l=()=>{}}={}){this.url=e,this.store=t,this.WebSocketImpl=n,this.schedule=r,this.minBackoff=i,this.maxBackoff=a,this.backoff=i,this.onStatus=o,this.onAction=l,this.stopped=!1,this.ws=null}connect(){const e=new this.WebSocketImpl(this.url);this.ws=e,e.onopen=()=>{this.backoff=this.minBackoff,e.send(lo(gh()))},e.onmessage=t=>this._onMessage(t.data),e.onclose=()=>{this.stopped||(this.onStatus("close"),this.schedule(()=>this.connect(),this.backoff),this.backoff=Math.min(this.backoff*2,this.maxBackoff))}}_onMessage(e){let t;try{t=_h(e)}catch(n){console.warn("viewbase: vadná zpráva ze serveru",n);return}t.type==="init"?(this.store.applyInit(t),this.onStatus("init")):t.type==="patch"?this.store.applyPatch(t)||this.ws.close():t.type==="action"?this.onAction(t):t.type==="error"&&(console.error("viewbase server:",t.error),t.error==="protocol_mismatch"&&(this.stopped=!0,this.onStatus("protocol_mismatch")))}send(e){this.ws&&this.ws.readyState===1&&this.ws.send(lo(e))}}class cr{constructor(){this.config={},this.nodeTypes={},this.flowTypes={},this.flows=[],this.windows=[],this.nodes=new Map,this.edges=new Map,this.seq=-1,this.listeners=new Set}static edgeKey(e,t){return e<=t?`${e}\0${t}`:`${t}\0${e}`}subscribe(e){return this.listeners.add(e),()=>this.listeners.delete(e)}_emit(e){for(const t of this.listeners)t(e)}applyInit(e){this.config=e.config,this.nodeTypes=e.node_types,this.flowTypes=e.flow_types??{},this.flows=e.flows??[],this.windows=e.windows??[],this.nodes.clear(),this.edges.clear();for(const t of e.nodes)this.nodes.set(t.id,t);for(const t of e.edges)this.edges.set(cr.edgeKey(t.source,t.target),t);this.seq=e.seq,this._emit({kind:"init"})}applyPatch(e){if(e.seq!==this.seq+1)return!1;for(const[t,n]of e.remove_edges)this.edges.delete(cr.edgeKey(t,n));for(const t of e.remove_nodes){this.nodes.delete(t);for(const[n,r]of this.edges)(r.source===t||r.target===t)&&this.edges.delete(n)}for(const t of e.add_nodes)this.nodes.set(t.id,t);for(const t of e.update_nodes)this.nodes.set(t.id,t);for(const t of e.add_edges){if(!this.nodes.has(t.source)||!this.nodes.has(t.target)){console.warn("viewbase: hrana s neznámým koncem přeskočena",t.source,t.target);continue}this.edges.set(cr.edgeKey(t.source,t.target),t)}return this.seq=e.seq,this._emit({kind:"patch",patch:e}),!0}}class xh{constructor(e=document.body){this.el=document.createElement("div"),this.el.dataset.role="status-overlay",this.el.style.cssText=["position:fixed","top:16px","left:50%","transform:translateX(-50%)","max-width:70%","padding:10px 18px","border-radius:6px","background:var(--vb-status-bg, rgba(20,23,28,0.85))","color:var(--vb-status-fg, #ffffff)","font:14px/1.4 system-ui,sans-serif","z-index:1000","display:none","pointer-events:none","text-align:center"].join(";"),e.appendChild(this.el)}show(e){this.el.textContent=e,this.el.style.display="block"}hide(){this.el.style.display="none"}}function Ns(s,e,t,n,r){const i=Math.max(0,r.width-t),a=Math.max(0,r.height-n);return{x:Math.min(Math.max(0,s),i),y:Math.min(Math.max(0,e),a)}}function yh(s,e,t,n,r){return{x:s*(e+t),y:n-r}}const co=160,Sh=8,ho=28,Mh="vb-pos:";function bh(s,e){const t=s??e;return t?Mh+String(t):null}class Ba{constructor({id:e,title:t,widthChars:n,container:r,manager:i,kind:a,closable:o=!0}){this.id=e,this.title=t,this.widthChars=n,this.container=r,this.manager=i,this.kind=a,this.closable=o!==!1,this.isMinimized=!1,this.saved=null,this.dragOffset=null,this.body=null,this.el=document.createElement("div"),this.el.dataset.role="vb-window",this.el.dataset.windowId=String(e),this.el.style.cssText=["position:absolute","left:0","top:0","box-sizing:border-box","background:var(--vb-window-body-bg, rgba(255,255,255,0.97))","color:var(--vb-window-body-fg, #1f2430)","box-shadow:var(--vb-window-shadow, 0 6px 20px rgba(0,0,0,0.22))","border-radius:6px","overflow:hidden","user-select:none","font:13px/1.5 system-ui,sans-serif","z-index:900"].join(";"),this._buildHeader()}_buildBody(){}_renderBody(){}_mount(){this.container.appendChild(this.el);const e=this._bounds(),t=this.manager.windows.size%8*24,n=Ns(40+t,40+t,this._width(),200,e),r=this._loadPos(),i=r?Ns(r.x,r.y,this._width(),200,e):n;this._place(i.x,i.y),this.el.addEventListener("pointerdown",()=>this.bringToFront())}_posKey(){return bh(this.id,this.title)}_loadPos(){const e=this._posKey();if(!e)return null;try{const t=localStorage.getItem(e);if(!t)return null;const n=JSON.parse(t);if(Number.isFinite(n==null?void 0:n.x)&&Number.isFinite(n==null?void 0:n.y))return n}catch{}return null}_savePos(){const e=this._posKey();if(e)try{localStorage.setItem(e,JSON.stringify({x:this.x,y:this.y}))}catch{}}_width(){return this.widthChars*8+24}_bounds(){return{width:this.container.clientWidth||800,height:this.container.clientHeight||600}}_buildHeader(){const e=document.createElement("div");e.dataset.role="vb-titlebar",e.style.cssText=["display:flex","align-items:center","gap:6px","padding:4px 6px","cursor:move","background:var(--vb-window-header-bg, #d8dde6)","color:var(--vb-window-header-fg, #1f2430)"].join(";"),this.closeGadget=null,this.closable&&(this.closeGadget=this._gadget("close","×"),this.closeGadget.addEventListener("click",t=>{t.stopPropagation(),this.close()})),this.titleEl=document.createElement("div"),this.titleEl.textContent=this.title,this.titleEl.style.cssText=["flex:1","text-align:center","font-weight:600","white-space:nowrap","overflow:hidden","text-overflow:ellipsis"].join(";"),this.minGadget=this._gadget("minimize","–"),this.minGadget.addEventListener("click",t=>{t.stopPropagation(),this.minimize()}),this.restoreGadget=this._gadget("restore","▢"),this.restoreGadget.addEventListener("click",t=>{t.stopPropagation(),this.restore()}),this.restoreGadget.style.display="none",this.closeGadget&&e.append(this.closeGadget),e.append(this.titleEl,this.minGadget,this.restoreGadget),this._dragFromHeader(e),this.bar=e,this.el.appendChild(e)}_gadget(e,t){const n=document.createElement("button");return n.dataset.gadget=e,n.textContent=t,n.style.cssText=["flex:0 0 auto","width:18px","height:18px","line-height:16px","padding:0","border:1px solid var(--vb-window-gadget, #8a93a3)","border-radius:3px","background:transparent","cursor:pointer","color:var(--vb-window-gadget, #5a6573)","font-size:13px"].join(";"),n}_dragFromHeader(e){e.addEventListener("pointerdown",n=>{if(n.target.dataset.gadget)return;this.bringToFront();const r=this.el.getBoundingClientRect(),i=this.container.getBoundingClientRect();this.dragOffset={x:n.clientX-r.left,y:n.clientY-r.top,contLeft:i.left,contTop:i.top},e.setPointerCapture(n.pointerId)}),e.addEventListener("pointermove",n=>{if(!this.dragOffset||this.isMinimized)return;const r=n.clientX-this.dragOffset.contLeft-this.dragOffset.x,i=n.clientY-this.dragOffset.contTop-this.dragOffset.y,a=Ns(r,i,this._width(),this._headerH(),this._bounds());this._place(a.x,a.y)});const t=n=>{if(this.dragOffset){this.dragOffset=null;try{e.releasePointerCapture(n.pointerId)}catch{}this.isMinimized||this._savePos()}};e.addEventListener("pointerup",t),e.addEventListener("pointercancel",t)}_headerH(){return this.bar.offsetHeight||ho}_place(e,t){this.x=e,this.y=t,this.el.style.left=`${e}px`,this.el.style.top=`${t}px`}minimize(){if(this.isMinimized)return;this.isMinimized=!0,this.saved={x:this.x,y:this.y},this.body.style.display="none",this.minGadget.style.display="none",this.restoreGadget.style.display="",this.el.dataset.role="vb-dock-strip",this.el.style.background="var(--vb-window-dock-bg, #c2c9d4)",this.el.style.width=`${co}px`,this.titleEl.style.fontSize="11px";const e=this.manager._assignDockSlot(this),t=this._bounds(),n=yh(e,co,Sh,t.height,ho);this._place(n.x,n.y)}restore(){if(!this.isMinimized)return;this.isMinimized=!1,this.manager._releaseDockSlot(this),this.el.dataset.role="vb-window",this.el.style.background="var(--vb-window-body-bg, rgba(255,255,255,0.97))",this.el.style.width="",this.titleEl.style.fontSize="",this.body.style.display="",this.minGadget.style.display="",this.restoreGadget.style.display="none",this._renderBody();const e=this.saved??{x:40,y:40};this._place(e.x,e.y),this.bringToFront()}bringToFront(){this.setZ(this.manager._nextZ())}setZ(e){this.el.style.zIndex=String(e)}applyTheme(){this.isMinimized||this._renderBody()}close(){this.isMinimized&&this.manager._releaseDockSlot(this),this.el.remove(),this.manager._forget(this.id)}}function pc(s,e,{now:t=()=>Date.now(),schedule:n=(r,i)=>setTimeout(r,i)}={}){let r=-1/0,i=null,a=!1;function o(l){r=t(),s(...l)}return(...l)=>{const c=t()-r;if(!a&&c>=e){o(l);return}i=l,a||(a=!0,n(()=>{a=!1;const h=i;i=null,o(h)},Math.max(0,e-c)))}}const Eh=150;function Th(s,e){if(s.type==="int"){const t=Math.round(Number(e));return Number.isFinite(t)?Math.max(s.min,Math.min(s.max,t)):s.value}if(s.type==="number"){const t=Number(e);return Number.isFinite(t)?Math.max(s.min,Math.min(s.max,t)):s.value}return s.type==="bool"?typeof e=="boolean"?e:s.value:s.type==="string"?String(e??"").slice(0,s.maxlength):s.type==="enum"&&s.options.some(t=>t.value===e)?e:s.value}function wh(s,e){const t={};for(const n of s)n.key in e&&(t[n.key]=Th(n,e[n.key]));return t}class Ah extends Ba{constructor({id:e,title:t,fields:n,widthChars:r,onSubmit:i,container:a,manager:o,live:l=!1,closable:c}){super({id:e,title:t,widthChars:r,container:a,manager:o,kind:"control",closable:c}),this.fields=n,this.onSubmit=i,this.live=!!l,this.inputs=new Map,this._buildBody(),this._mount()}_buildBody(){const e=document.createElement("div");e.dataset.role="control-body",e.style.cssText=["padding:8px 10px",`width:${this.widthChars}ch`,"max-width:90vw","font:13px/1.5 system-ui,sans-serif"].join(";"),this.body=e;const t=document.createElement("table");t.style.cssText="border-collapse:collapse;width:100%";for(const n of this.fields){const r=t.insertRow(),i=r.insertCell();i.textContent=n.label,i.style.cssText=["padding:3px 10px 3px 0","white-space:nowrap","color:var(--vb-window-key, #667788)"].join(";");const a=r.insertCell();a.style.cssText="padding:3px 0",this.inputs.set(n.key,this._buildWidget(n,a))}if(e.appendChild(t),this.live){const n=pc(()=>this._submit(),Eh);e.addEventListener("input",n),e.addEventListener("change",n)}else{const n=document.createElement("button");n.dataset.role="control-apply",n.textContent="Použít",n.style.cssText=["margin-top:8px","padding:3px 12px","cursor:pointer","border:1px solid var(--vb-window-gadget, #8a93a3)","border-radius:4px","background:transparent","color:inherit"].join(";"),n.addEventListener("click",r=>{r.stopPropagation(),this._submit()}),e.appendChild(n)}this.el.appendChild(e)}_buildWidget(e,t){if(e.type==="enum"){const r=document.createElement("select");for(const i of e.options){const a=document.createElement("option");a.value=String(i.value),a.textContent=i.label,String(i.value)===String(e.value)&&(a.selected=!0),r.appendChild(a)}return t.appendChild(r),()=>{var i;return((i=e.options.find(a=>String(a.value)===r.value))==null?void 0:i.value)??e.value}}if(e.type==="int"||e.type==="number"){const r=e.step??(e.type==="int"?1:"any"),i=document.createElement("input");i.type="range",i.min=e.min,i.max=e.max,i.step=r==="any"?(e.max-e.min)/100||"any":r,i.value=e.value;const a=document.createElement("input");return a.type="number",a.min=e.min,a.max=e.max,a.step=r,a.value=e.value,a.style.cssText="width:5em;margin-left:6px",i.addEventListener("input",()=>{a.value=i.value}),a.addEventListener("input",()=>{i.value=a.value}),t.append(i,a),()=>a.value}if(e.type==="bool"){const r=document.createElement("input");return r.type="checkbox",r.checked=!!e.value,t.appendChild(r),()=>r.checked}const n=document.createElement("input");return n.type="text",n.maxLength=e.maxlength,n.value=e.value,t.appendChild(n),()=>n.value}_submit(){const e={};for(const[n,r]of this.inputs)e[n]=r();const t=wh(this.fields,e);this.onSubmit&&this.onSubmit({window_id:this.id,values:t})}_renderBody(){}}const Ch=8,Rh=220;function Ph(s){const e=Number(s);return!Number.isFinite(e)||e<=0?60:Math.max(20,Math.round(e/Ch))}class Uh extends Ba{constructor({id:e,title:t,prompt:n,width:r,onInput:i,container:a,manager:o,closable:l,input:c}){super({id:e,title:t,widthChars:Ph(r),container:a,manager:o,kind:"terminal",closable:l}),this.prompt=n??"> ",this.hasInput=c!==!1,this.onInput=i,this._buildBody(),this._mount()}_buildBody(){const e=document.createElement("div");e.dataset.role="terminal-body",e.style.cssText=["padding:6px 8px",`width:${this.widthChars}ch`,"max-width:92vw","font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace","display:flex","flex-direction:column","gap:6px"].join(";");const t=document.createElement("div");if(t.dataset.role="terminal-output",t.style.cssText=[`height:${Rh}px`,"overflow-y:auto","white-space:pre-wrap","word-break:break-word","background:var(--vb-window-output-bg, rgba(0,0,0,0.06))","border-radius:4px","padding:6px 8px"].join(";"),this.output=t,e.append(t),this.hasInput){const n=document.createElement("div");n.style.cssText="display:flex;align-items:center;gap:4px";const r=document.createElement("span");r.textContent=this.prompt,r.style.cssText="color:var(--vb-window-key, #667788);flex:0 0 auto";const i=document.createElement("input");i.type="text",i.dataset.role="terminal-input",i.style.cssText="flex:1 1 auto;min-width:0;font:inherit",i.addEventListener("keydown",a=>{if(a.key!=="Enter")return;a.stopPropagation();const o=i.value.trim();i.value="",o&&this._submit(o)}),this.input=i,n.append(r,i),e.append(n)}this.body=e,this.el.appendChild(e)}_submit(e){this.onInput&&this.onInput({window_id:this.id,line:e})}append(e){const t=document.createElement("div");t.textContent=String(e??""),this.output.appendChild(t),this.output.scrollTop=this.output.scrollHeight}_renderBody(){}}const Dh=30;function uo(s,e){const t=(s==null?void 0:s.meta)??{};return e==null?Object.entries(t).map(([n,r])=>({label:n,value:String(r??"")})):e.map(([n,r])=>({label:n,value:String(t[r]??"")}))}function Lh(s,e){const t=e instanceof Set?e:new Set(e),n=(s.remove_nodes??[]).filter(a=>t.has(a)),r=new Set(n);return{refresh:(s.update_nodes??[]).map(a=>a.id).filter(a=>t.has(a)&&!r.has(a)),close:n}}class Ih extends Ba{constructor({nodeId:e,title:t,rows:n,widthChars:r,container:i,manager:a}){super({id:e,title:t,widthChars:r,container:i,manager:a,kind:"detail"}),this.rows=n,this._buildBody(),this._mount()}_buildBody(){const e=document.createElement("div");e.dataset.role="detail-body",e.style.cssText=["padding:6px 10px",`width:${this.widthChars}ch`,"max-width:90vw","font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace","overflow:auto"].join(";"),this.body=e,this._renderBody(),this.el.appendChild(e)}_renderBody(){this.body.replaceChildren();const e=document.createElement("table");e.style.cssText="border-collapse:collapse;width:100%";for(const{label:t,value:n}of this.rows){const r=e.insertRow(),i=r.insertCell();i.textContent=t,i.style.cssText=["padding:1px 12px 1px 0","vertical-align:top","white-space:nowrap","color:var(--vb-window-key, #667788)"].join(";");const a=r.insertCell();a.dataset.role="detail-value",a.textContent=n,a.style.cssText=["padding:1px 0","word-break:break-all","cursor:copy"].join(";"),a.addEventListener("click",o=>{o.stopPropagation(),this._copy(n,a)})}this.body.appendChild(e)}_copy(e,t){const n=()=>{t.style.transition="background 0.15s";const r=t.style.background;t.style.background="var(--vb-window-gadget, #8a93a3)",setTimeout(()=>{t.style.background=r},180)};navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(e).then(n).catch(()=>{this._execCopy(e),n()}):(this._execCopy(e),n())}_execCopy(e){try{const t=document.createElement("textarea");t.value=e,t.style.cssText="position:fixed;left:-9999px;top:0",document.body.appendChild(t),t.select(),document.execCommand("copy"),document.body.removeChild(t)}catch{console.warn("viewbase: kopírování do schránky selhalo")}}update({title:e,rows:t}){e!=null&&(this.title=e,this.titleEl.textContent=e),t!=null&&(this.rows=t,this.isMinimized||this._renderBody())}}class Fh{constructor(e,t,n=()=>null){this.container=e,this.store=t,this.getTheme=n,this.windows=new Map,this.z=900,this.dockSlots=[]}_config(){var t;return((t=this.store.config)==null?void 0:t.detail_window)??{rows:null,width_chars:128,open_on_click:!0}}openFor(e){const t=this.windows.get(e);if(t)return t.isMinimized?t.restore():t.bringToFront(),t;const n=this.store.nodes.get(e);if(!n)return null;const r=this._config(),i=new Ih({nodeId:e,title:n.label,rows:uo(n,r.rows),widthChars:r.width_chars,container:this.container,manager:this});return this.windows.set(e,i),i.bringToFront(),i}openControl(e,t){const n=this.windows.get(e.window_id);n&&n.close();const r=new Ah({id:e.window_id,title:e.title,fields:e.fields,live:e.live,closable:e.closable,widthChars:Dh,onSubmit:t,container:this.container,manager:this});return this.windows.set(e.window_id,r),r.bringToFront(),r}closeControl(e){var t;(t=this.windows.get(e))==null||t.close()}openTerminal(e,t){const n=this.windows.get(e.window_id);n&&n.close();const r=new Uh({id:e.window_id,title:e.title,prompt:e.prompt,width:e.width,closable:e.closable,input:e.input,onInput:t,container:this.container,manager:this});return this.windows.set(e.window_id,r),r.bringToFront(),r}terminalAppend(e,t){const n=this.windows.get(e);n&&n.kind==="terminal"&&n.append(t)}onPatch(e){var a;const t=new Set;for(const[o,l]of this.windows)l.kind==="detail"&&t.add(o);if(t.size===0)return;const{refresh:n,close:r}=Lh(e,t);for(const o of r)(a=this.windows.get(o))==null||a.close();const i=this._config();for(const o of n){const l=this.windows.get(o),c=this.store.nodes.get(o);l&&c&&l.update({title:c.label,rows:uo(c,i.rows)})}}applyTheme(){for(const e of this.windows.values())e.applyTheme()}close(e){var t;(t=this.windows.get(e))==null||t.close()}_nextZ(){return this.z+=1,this.z}_assignDockSlot(e){let t=this.dockSlots.indexOf(null);return t===-1?(t=this.dockSlots.length,this.dockSlots.push(e)):this.dockSlots[t]=e,e._dockSlot=t,t}_releaseDockSlot(e){const t=e._dockSlot;t!=null&&this.dockSlots[t]===e&&(this.dockSlots[t]=null),e._dockSlot=null}_forget(e){this.windows.delete(e)}}function Nh(s,e,t){const n=new Set;if(!s.nodes.has(e)||(n.add(e),t<=0))return n;const r=new Map,i=(o,l)=>{r.has(o)||r.set(o,[]),r.get(o).push(l)};for(const o of s.edges.values())i(o.source,o.target),i(o.target,o.source);let a=[e];for(let o=0;o<t&&a.length>0;o+=1){const l=[];for(const c of a)for(const h of r.get(c)??[])n.has(h)||(n.add(h),l.push(h));a=l}return n}/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const ka="165",_n={ROTATE:0,DOLLY:1,PAN:2},Un={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Oh=0,fo=1,Bh=2,mc=1,kh=2,gn=3,Nn=0,Ft=1,sn=2,yn=0,Ai=1,ls=2,po=3,mo=4,zh=5,Kn=100,Gh=101,Hh=102,Vh=103,Wh=104,Xh=200,Yh=201,jh=202,qh=203,Sa=204,Ma=205,Kh=206,Zh=207,Jh=208,Qh=209,$h=210,eu=211,tu=212,nu=213,iu=214,ru=0,su=1,au=2,cs=3,ou=4,lu=5,cu=6,hu=7,gc=0,uu=1,fu=2,In=0,du=1,pu=2,mu=3,gu=4,_u=5,vu=6,xu=7,_c=300,Ui=301,Di=302,ba=303,Ea=304,vs=306,Ta=1e3,Jn=1001,wa=1002,Lt=1003,yu=1004,Tr=1005,kt=1006,Os=1007,Qn=1008,On=1009,Su=1010,Mu=1011,hs=1012,vc=1013,Li=1014,vn=1015,Fn=1016,xc=1017,yc=1018,Ii=1020,bu=35902,Eu=1021,Tu=1022,on=1023,wu=1024,Au=1025,Ci=1026,Fi=1027,Sc=1028,Mc=1029,Cu=1030,bc=1031,Ec=1033,Bs=33776,ks=33777,zs=33778,Gs=33779,go=35840,_o=35841,vo=35842,xo=35843,yo=36196,So=37492,Mo=37496,bo=37808,Eo=37809,To=37810,wo=37811,Ao=37812,Co=37813,Ro=37814,Po=37815,Uo=37816,Do=37817,Lo=37818,Io=37819,Fo=37820,No=37821,Hs=36492,Oo=36494,Bo=36495,Ru=36283,ko=36284,zo=36285,Go=36286,Pu=3200,Tc=3201,wc=0,Uu=1,Ln="",nn="srgb",Bn="srgb-linear",za="display-p3",xs="display-p3-linear",us="linear",at="srgb",fs="rec709",ds="p3",ai=7680,Ho=519,Du=512,Lu=513,Iu=514,Ac=515,Fu=516,Nu=517,Ou=518,Bu=519,Vo=35044,Wo="300 es",xn=2e3,ps=2001;class ti{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;const n=this._listeners;return n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;const r=this._listeners[e];if(r!==void 0){const i=r.indexOf(t);i!==-1&&r.splice(i,1)}}dispatchEvent(e){if(this._listeners===void 0)return;const n=this._listeners[e.type];if(n!==void 0){e.target=this;const r=n.slice(0);for(let i=0,a=r.length;i<a;i++)r[i].call(this,e);e.target=null}}}const bt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],is=Math.PI/180,Aa=180/Math.PI;function dr(){const s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(bt[s&255]+bt[s>>8&255]+bt[s>>16&255]+bt[s>>24&255]+"-"+bt[e&255]+bt[e>>8&255]+"-"+bt[e>>16&15|64]+bt[e>>24&255]+"-"+bt[t&63|128]+bt[t>>8&255]+"-"+bt[t>>16&255]+bt[t>>24&255]+bt[n&255]+bt[n>>8&255]+bt[n>>16&255]+bt[n>>24&255]).toLowerCase()}function Ct(s,e,t){return Math.max(e,Math.min(t,s))}function ku(s,e){return(s%e+e)%e}function Vs(s,e,t){return(1-t)*s+t*e}function Ji(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return s/4294967295;case Uint16Array:return s/65535;case Uint8Array:return s/255;case Int32Array:return Math.max(s/2147483647,-1);case Int16Array:return Math.max(s/32767,-1);case Int8Array:return Math.max(s/127,-1);default:throw new Error("Invalid component type.")}}function Dt(s,e){switch(e.constructor){case Float32Array:return s;case Uint32Array:return Math.round(s*4294967295);case Uint16Array:return Math.round(s*65535);case Uint8Array:return Math.round(s*255);case Int32Array:return Math.round(s*2147483647);case Int16Array:return Math.round(s*32767);case Int8Array:return Math.round(s*127);default:throw new Error("Invalid component type.")}}const zu={DEG2RAD:is};class Oe{constructor(e=0,t=0){Oe.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ct(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Ke{constructor(e,t,n,r,i,a,o,l,c){Ke.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,l,c)}set(e,t,n,r,i,a,o,l,c){const h=this.elements;return h[0]=e,h[1]=r,h[2]=o,h[3]=t,h[4]=i,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],f=n[7],u=n[2],d=n[5],g=n[8],_=r[0],p=r[3],m=r[6],M=r[1],v=r[4],b=r[7],R=r[2],w=r[5],T=r[8];return i[0]=a*_+o*M+l*R,i[3]=a*p+o*v+l*w,i[6]=a*m+o*b+l*T,i[1]=c*_+h*M+f*R,i[4]=c*p+h*v+f*w,i[7]=c*m+h*b+f*T,i[2]=u*_+d*M+g*R,i[5]=u*p+d*v+g*w,i[8]=u*m+d*b+g*T,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8];return t*a*h-t*o*c-n*i*h+n*o*l+r*i*c-r*a*l}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],f=h*a-o*c,u=o*l-h*i,d=c*i-a*l,g=t*f+n*u+r*d;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return e[0]=f*_,e[1]=(r*c-h*n)*_,e[2]=(o*n-r*a)*_,e[3]=u*_,e[4]=(h*t-r*l)*_,e[5]=(r*i-o*t)*_,e[6]=d*_,e[7]=(n*l-c*t)*_,e[8]=(a*t-n*i)*_,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){const l=Math.cos(i),c=Math.sin(i);return this.set(n*l,n*c,-n*(l*a+c*o)+a+e,-r*c,r*l,-r*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Ws.makeScale(e,t)),this}rotate(e){return this.premultiply(Ws.makeRotation(-e)),this}translate(e,t){return this.premultiply(Ws.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<9;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Ws=new Ke;function Cc(s){for(let e=s.length-1;e>=0;--e)if(s[e]>=65535)return!0;return!1}function ms(s){return document.createElementNS("http://www.w3.org/1999/xhtml",s)}function Gu(){const s=ms("canvas");return s.style.display="block",s}const Xo={};function Rc(s){s in Xo||(Xo[s]=!0,console.warn(s))}function Hu(s,e,t){return new Promise(function(n,r){function i(){switch(s.clientWaitSync(e,s.SYNC_FLUSH_COMMANDS_BIT,0)){case s.WAIT_FAILED:r();break;case s.TIMEOUT_EXPIRED:setTimeout(i,t);break;default:n()}}setTimeout(i,t)})}const Yo=new Ke().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),jo=new Ke().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),wr={[Bn]:{transfer:us,primaries:fs,toReference:s=>s,fromReference:s=>s},[nn]:{transfer:at,primaries:fs,toReference:s=>s.convertSRGBToLinear(),fromReference:s=>s.convertLinearToSRGB()},[xs]:{transfer:us,primaries:ds,toReference:s=>s.applyMatrix3(jo),fromReference:s=>s.applyMatrix3(Yo)},[za]:{transfer:at,primaries:ds,toReference:s=>s.convertSRGBToLinear().applyMatrix3(jo),fromReference:s=>s.applyMatrix3(Yo).convertLinearToSRGB()}},Vu=new Set([Bn,xs]),nt={enabled:!0,_workingColorSpace:Bn,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(s){if(!Vu.has(s))throw new Error(`Unsupported working color space, "${s}".`);this._workingColorSpace=s},convert:function(s,e,t){if(this.enabled===!1||e===t||!e||!t)return s;const n=wr[e].toReference,r=wr[t].fromReference;return r(n(s))},fromWorkingColorSpace:function(s,e){return this.convert(s,this._workingColorSpace,e)},toWorkingColorSpace:function(s,e){return this.convert(s,e,this._workingColorSpace)},getPrimaries:function(s){return wr[s].primaries},getTransfer:function(s){return s===Ln?us:wr[s].transfer}};function Ri(s){return s<.04045?s*.0773993808:Math.pow(s*.9478672986+.0521327014,2.4)}function Xs(s){return s<.0031308?s*12.92:1.055*Math.pow(s,.41666)-.055}let oi;class Wu{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{oi===void 0&&(oi=ms("canvas")),oi.width=e.width,oi.height=e.height;const n=oi.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),t=oi}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=ms("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let a=0;a<i.length;a++)i[a]=Ri(i[a]/255)*255;return n.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(Ri(t[n]/255)*255):t[n]=Ri(t[n]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Xu=0;class Pc{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Xu++}),this.uuid=dr(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let i;if(Array.isArray(r)){i=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?i.push(Ys(r[a].image)):i.push(Ys(r[a]))}else i=Ys(r);n.url=i}return t||(e.images[this.uuid]=n),n}}function Ys(s){return typeof HTMLImageElement<"u"&&s instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&s instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&s instanceof ImageBitmap?Wu.getDataURL(s):s.data?{data:Array.from(s.data),width:s.width,height:s.height,type:s.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Yu=0;class Tt extends ti{constructor(e=Tt.DEFAULT_IMAGE,t=Tt.DEFAULT_MAPPING,n=Jn,r=Jn,i=kt,a=Qn,o=on,l=On,c=Tt.DEFAULT_ANISOTROPY,h=Ln){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Yu++}),this.uuid=dr(),this.name="",this.source=new Pc(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=i,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new Oe(0,0),this.repeat=new Oe(1,1),this.center=new Oe(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ke,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==_c)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Ta:e.x=e.x-Math.floor(e.x);break;case Jn:e.x=e.x<0?0:1;break;case wa:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Ta:e.y=e.y-Math.floor(e.y);break;case Jn:e.y=e.y<0?0:1;break;case wa:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Tt.DEFAULT_IMAGE=null;Tt.DEFAULT_MAPPING=_c;Tt.DEFAULT_ANISOTROPY=1;class ht{constructor(e=0,t=0,n=0,r=1){ht.prototype.isVector4=!0,this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i;const l=e.elements,c=l[0],h=l[4],f=l[8],u=l[1],d=l[5],g=l[9],_=l[2],p=l[6],m=l[10];if(Math.abs(h-u)<.01&&Math.abs(f-_)<.01&&Math.abs(g-p)<.01){if(Math.abs(h+u)<.1&&Math.abs(f+_)<.1&&Math.abs(g+p)<.1&&Math.abs(c+d+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const v=(c+1)/2,b=(d+1)/2,R=(m+1)/2,w=(h+u)/4,T=(f+_)/4,P=(g+p)/4;return v>b&&v>R?v<.01?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(v),r=w/n,i=T/n):b>R?b<.01?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(b),n=w/r,i=P/r):R<.01?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(R),n=T/i,r=P/i),this.set(n,r,i,t),this}let M=Math.sqrt((p-g)*(p-g)+(f-_)*(f-_)+(u-h)*(u-h));return Math.abs(M)<.001&&(M=1),this.x=(p-g)/M,this.y=(f-_)/M,this.z=(u-h)/M,this.w=Math.acos((c+d+m-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class ju extends ti{constructor(e=1,t=1,n={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new ht(0,0,e,t),this.scissorTest=!1,this.viewport=new ht(0,0,e,t);const r={width:e,height:t,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:kt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},n);const i=new Tt(r,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);i.flipY=!1,i.generateMipmaps=n.generateMipmaps,i.internalFormat=n.internalFormat,this.textures=[];const a=n.count;for(let o=0;o<a;o++)this.textures[o]=i.clone(),this.textures[o].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let n=0,r=e.textures.length;n<r;n++)this.textures[n]=e.textures[n].clone(),this.textures[n].isRenderTargetTexture=!0;const t=Object.assign({},e.texture.image);return this.texture.source=new Pc(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class en extends ju{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Uc extends Tt{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Lt,this.minFilter=Lt,this.wrapR=Jn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class qu extends Tt{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Lt,this.minFilter=Lt,this.wrapR=Jn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ei{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let l=n[r+0],c=n[r+1],h=n[r+2],f=n[r+3];const u=i[a+0],d=i[a+1],g=i[a+2],_=i[a+3];if(o===0){e[t+0]=l,e[t+1]=c,e[t+2]=h,e[t+3]=f;return}if(o===1){e[t+0]=u,e[t+1]=d,e[t+2]=g,e[t+3]=_;return}if(f!==_||l!==u||c!==d||h!==g){let p=1-o;const m=l*u+c*d+h*g+f*_,M=m>=0?1:-1,v=1-m*m;if(v>Number.EPSILON){const R=Math.sqrt(v),w=Math.atan2(R,m*M);p=Math.sin(p*w)/R,o=Math.sin(o*w)/R}const b=o*M;if(l=l*p+u*b,c=c*p+d*b,h=h*p+g*b,f=f*p+_*b,p===1-o){const R=1/Math.sqrt(l*l+c*c+h*h+f*f);l*=R,c*=R,h*=R,f*=R}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=f}static multiplyQuaternionsFlat(e,t,n,r,i,a){const o=n[r],l=n[r+1],c=n[r+2],h=n[r+3],f=i[a],u=i[a+1],d=i[a+2],g=i[a+3];return e[t]=o*g+h*f+l*d-c*u,e[t+1]=l*g+h*u+c*f-o*d,e[t+2]=c*g+h*d+o*u-l*f,e[t+3]=h*g-o*f-l*u-c*d,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(r/2),f=o(i/2),u=l(n/2),d=l(r/2),g=l(i/2);switch(a){case"XYZ":this._x=u*h*f+c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f-u*d*g;break;case"YXZ":this._x=u*h*f+c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f+u*d*g;break;case"ZXY":this._x=u*h*f-c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f-u*d*g;break;case"ZYX":this._x=u*h*f-c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f+u*d*g;break;case"YZX":this._x=u*h*f+c*d*g,this._y=c*d*f+u*h*g,this._z=c*h*g-u*d*f,this._w=c*h*f-u*d*g;break;case"XZY":this._x=u*h*f-c*d*g,this._y=c*d*f-u*h*g,this._z=c*h*g+u*d*f,this._w=c*h*f+u*d*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],l=t[9],c=t[2],h=t[6],f=t[10],u=n+o+f;if(u>0){const d=.5/Math.sqrt(u+1);this._w=.25/d,this._x=(h-l)*d,this._y=(i-c)*d,this._z=(a-r)*d}else if(n>o&&n>f){const d=2*Math.sqrt(1+n-o-f);this._w=(h-l)/d,this._x=.25*d,this._y=(r+a)/d,this._z=(i+c)/d}else if(o>f){const d=2*Math.sqrt(1+o-n-f);this._w=(i-c)/d,this._x=(r+a)/d,this._y=.25*d,this._z=(l+h)/d}else{const d=2*Math.sqrt(1+f-n-o);this._w=(a-r)/d,this._x=(i+c)/d,this._y=(l+h)/d,this._z=.25*d}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<Number.EPSILON?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ct(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+a*o+r*c-i*l,this._y=r*h+a*l+i*o-n*c,this._z=i*h+a*c+n*l-r*o,this._w=a*h-n*o-r*l-i*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const n=this._x,r=this._y,i=this._z,a=this._w;let o=a*e._w+n*e._x+r*e._y+i*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=r,this._z=i,this;const l=1-o*o;if(l<=Number.EPSILON){const d=1-t;return this._w=d*a+t*this._w,this._x=d*n+t*this._x,this._y=d*r+t*this._y,this._z=d*i+t*this._z,this.normalize(),this}const c=Math.sqrt(l),h=Math.atan2(c,o),f=Math.sin((1-t)*h)/c,u=Math.sin(t*h)/c;return this._w=a*f+this._w*u,this._x=n*f+this._x*u,this._y=r*f+this._y*u,this._z=i*f+this._z*u,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class V{constructor(e=0,t=0,n=0){V.prototype.isVector3=!0,this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(qo.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(qo.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){const t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*r-o*n),h=2*(o*t-i*r),f=2*(i*n-a*t);return this.x=t+l*c+a*f-o*h,this.y=n+l*h+o*c-i*f,this.z=r+l*f+i*h-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,l=t.z;return this.x=r*l-i*o,this.y=i*a-n*l,this.z=n*o-r*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return js.copy(this).projectOnVector(e),this.sub(js)}reflect(e){return this.sub(js.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(Ct(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const js=new V,qo=new ei;class Sn{constructor(e=new V(1/0,1/0,1/0),t=new V(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Jt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Jt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=Jt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const i=n.getAttribute("position");if(t===!0&&i!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=i.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,Jt):Jt.fromBufferAttribute(i,a),Jt.applyMatrix4(e.matrixWorld),this.expandByPoint(Jt);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Ar.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Ar.copy(n.boundingBox)),Ar.applyMatrix4(e.matrixWorld),this.union(Ar)}const r=e.children;for(let i=0,a=r.length;i<a;i++)this.expandByObject(r[i],t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,Jt),Jt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Qi),Cr.subVectors(this.max,Qi),li.subVectors(e.a,Qi),ci.subVectors(e.b,Qi),hi.subVectors(e.c,Qi),Tn.subVectors(ci,li),wn.subVectors(hi,ci),Gn.subVectors(li,hi);let t=[0,-Tn.z,Tn.y,0,-wn.z,wn.y,0,-Gn.z,Gn.y,Tn.z,0,-Tn.x,wn.z,0,-wn.x,Gn.z,0,-Gn.x,-Tn.y,Tn.x,0,-wn.y,wn.x,0,-Gn.y,Gn.x,0];return!qs(t,li,ci,hi,Cr)||(t=[1,0,0,0,1,0,0,0,1],!qs(t,li,ci,hi,Cr))?!1:(Rr.crossVectors(Tn,wn),t=[Rr.x,Rr.y,Rr.z],qs(t,li,ci,hi,Cr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Jt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Jt).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(un[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),un[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),un[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),un[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),un[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),un[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),un[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),un[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(un),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}}const un=[new V,new V,new V,new V,new V,new V,new V,new V],Jt=new V,Ar=new Sn,li=new V,ci=new V,hi=new V,Tn=new V,wn=new V,Gn=new V,Qi=new V,Cr=new V,Rr=new V,Hn=new V;function qs(s,e,t,n,r){for(let i=0,a=s.length-3;i<=a;i+=3){Hn.fromArray(s,i);const o=r.x*Math.abs(Hn.x)+r.y*Math.abs(Hn.y)+r.z*Math.abs(Hn.z),l=e.dot(Hn),c=t.dot(Hn),h=n.dot(Hn);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}const Ku=new Sn,$i=new V,Ks=new V;class ni{constructor(e=new V,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):Ku.setFromPoints(e).getCenter(n);let r=0;for(let i=0,a=e.length;i<a;i++)r=Math.max(r,n.distanceToSquared(e[i]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;$i.subVectors(e,this.center);const t=$i.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),r=(n-this.radius)*.5;this.center.addScaledVector($i,r/n),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Ks.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint($i.copy(e.center).add(Ks)),this.expandByPoint($i.copy(e.center).sub(Ks))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}}const fn=new V,Zs=new V,Pr=new V,An=new V,Js=new V,Ur=new V,Qs=new V;class ys{constructor(e=new V,t=new V(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,fn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=fn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(fn.copy(this.origin).addScaledVector(this.direction,t),fn.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Zs.copy(e).add(t).multiplyScalar(.5),Pr.copy(t).sub(e).normalize(),An.copy(this.origin).sub(Zs);const i=e.distanceTo(t)*.5,a=-this.direction.dot(Pr),o=An.dot(this.direction),l=-An.dot(Pr),c=An.lengthSq(),h=Math.abs(1-a*a);let f,u,d,g;if(h>0)if(f=a*l-o,u=a*o-l,g=i*h,f>=0)if(u>=-g)if(u<=g){const _=1/h;f*=_,u*=_,d=f*(f+a*u+2*o)+u*(a*f+u+2*l)+c}else u=i,f=Math.max(0,-(a*u+o)),d=-f*f+u*(u+2*l)+c;else u=-i,f=Math.max(0,-(a*u+o)),d=-f*f+u*(u+2*l)+c;else u<=-g?(f=Math.max(0,-(-a*i+o)),u=f>0?-i:Math.min(Math.max(-i,-l),i),d=-f*f+u*(u+2*l)+c):u<=g?(f=0,u=Math.min(Math.max(-i,-l),i),d=u*(u+2*l)+c):(f=Math.max(0,-(a*i+o)),u=f>0?i:Math.min(Math.max(-i,-l),i),d=-f*f+u*(u+2*l)+c);else u=a>0?-i:i,f=Math.max(0,-(a*u+o)),d=-f*f+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,f),r&&r.copy(Zs).addScaledVector(Pr,u),d}intersectSphere(e,t){fn.subVectors(e.center,this.origin);const n=fn.dot(this.direction),r=fn.dot(fn)-n*n,i=e.radius*e.radius;if(r>i)return null;const a=Math.sqrt(i-r),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,l;const c=1/this.direction.x,h=1/this.direction.y,f=1/this.direction.z,u=this.origin;return c>=0?(n=(e.min.x-u.x)*c,r=(e.max.x-u.x)*c):(n=(e.max.x-u.x)*c,r=(e.min.x-u.x)*c),h>=0?(i=(e.min.y-u.y)*h,a=(e.max.y-u.y)*h):(i=(e.max.y-u.y)*h,a=(e.min.y-u.y)*h),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),f>=0?(o=(e.min.z-u.z)*f,l=(e.max.z-u.z)*f):(o=(e.max.z-u.z)*f,l=(e.min.z-u.z)*f),n>l||o>r)||((o>n||n!==n)&&(n=o),(l<r||r!==r)&&(r=l),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,fn)!==null}intersectTriangle(e,t,n,r,i){Js.subVectors(t,e),Ur.subVectors(n,e),Qs.crossVectors(Js,Ur);let a=this.direction.dot(Qs),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;An.subVectors(this.origin,e);const l=o*this.direction.dot(Ur.crossVectors(An,Ur));if(l<0)return null;const c=o*this.direction.dot(Js.cross(An));if(c<0||l+c>a)return null;const h=-o*An.dot(Qs);return h<0?null:this.at(h/a,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class it{constructor(e,t,n,r,i,a,o,l,c,h,f,u,d,g,_,p){it.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,l,c,h,f,u,d,g,_,p)}set(e,t,n,r,i,a,o,l,c,h,f,u,d,g,_,p){const m=this.elements;return m[0]=e,m[4]=t,m[8]=n,m[12]=r,m[1]=i,m[5]=a,m[9]=o,m[13]=l,m[2]=c,m[6]=h,m[10]=f,m[14]=u,m[3]=d,m[7]=g,m[11]=_,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new it().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,n=e.elements,r=1/ui.setFromMatrixColumn(e,0).length(),i=1/ui.setFromMatrixColumn(e,1).length(),a=1/ui.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(r),c=Math.sin(r),h=Math.cos(i),f=Math.sin(i);if(e.order==="XYZ"){const u=a*h,d=a*f,g=o*h,_=o*f;t[0]=l*h,t[4]=-l*f,t[8]=c,t[1]=d+g*c,t[5]=u-_*c,t[9]=-o*l,t[2]=_-u*c,t[6]=g+d*c,t[10]=a*l}else if(e.order==="YXZ"){const u=l*h,d=l*f,g=c*h,_=c*f;t[0]=u+_*o,t[4]=g*o-d,t[8]=a*c,t[1]=a*f,t[5]=a*h,t[9]=-o,t[2]=d*o-g,t[6]=_+u*o,t[10]=a*l}else if(e.order==="ZXY"){const u=l*h,d=l*f,g=c*h,_=c*f;t[0]=u-_*o,t[4]=-a*f,t[8]=g+d*o,t[1]=d+g*o,t[5]=a*h,t[9]=_-u*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){const u=a*h,d=a*f,g=o*h,_=o*f;t[0]=l*h,t[4]=g*c-d,t[8]=u*c+_,t[1]=l*f,t[5]=_*c+u,t[9]=d*c-g,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){const u=a*l,d=a*c,g=o*l,_=o*c;t[0]=l*h,t[4]=_-u*f,t[8]=g*f+d,t[1]=f,t[5]=a*h,t[9]=-o*h,t[2]=-c*h,t[6]=d*f+g,t[10]=u-_*f}else if(e.order==="XZY"){const u=a*l,d=a*c,g=o*l,_=o*c;t[0]=l*h,t[4]=-f,t[8]=c*h,t[1]=u*f+_,t[5]=a*h,t[9]=d*f-g,t[2]=g*f-d,t[6]=o*h,t[10]=_*f+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Zu,e,Ju)}lookAt(e,t,n){const r=this.elements;return Ot.subVectors(e,t),Ot.lengthSq()===0&&(Ot.z=1),Ot.normalize(),Cn.crossVectors(n,Ot),Cn.lengthSq()===0&&(Math.abs(n.z)===1?Ot.x+=1e-4:Ot.z+=1e-4,Ot.normalize(),Cn.crossVectors(n,Ot)),Cn.normalize(),Dr.crossVectors(Ot,Cn),r[0]=Cn.x,r[4]=Dr.x,r[8]=Ot.x,r[1]=Cn.y,r[5]=Dr.y,r[9]=Ot.y,r[2]=Cn.z,r[6]=Dr.z,r[10]=Ot.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],f=n[5],u=n[9],d=n[13],g=n[2],_=n[6],p=n[10],m=n[14],M=n[3],v=n[7],b=n[11],R=n[15],w=r[0],T=r[4],P=r[8],E=r[12],y=r[1],L=r[5],U=r[9],I=r[13],N=r[2],W=r[6],k=r[10],se=r[14],j=r[3],K=r[7],q=r[11],F=r[15];return i[0]=a*w+o*y+l*N+c*j,i[4]=a*T+o*L+l*W+c*K,i[8]=a*P+o*U+l*k+c*q,i[12]=a*E+o*I+l*se+c*F,i[1]=h*w+f*y+u*N+d*j,i[5]=h*T+f*L+u*W+d*K,i[9]=h*P+f*U+u*k+d*q,i[13]=h*E+f*I+u*se+d*F,i[2]=g*w+_*y+p*N+m*j,i[6]=g*T+_*L+p*W+m*K,i[10]=g*P+_*U+p*k+m*q,i[14]=g*E+_*I+p*se+m*F,i[3]=M*w+v*y+b*N+R*j,i[7]=M*T+v*L+b*W+R*K,i[11]=M*P+v*U+b*k+R*q,i[15]=M*E+v*I+b*se+R*F,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],l=e[9],c=e[13],h=e[2],f=e[6],u=e[10],d=e[14],g=e[3],_=e[7],p=e[11],m=e[15];return g*(+i*l*f-r*c*f-i*o*u+n*c*u+r*o*d-n*l*d)+_*(+t*l*d-t*c*u+i*a*u-r*a*d+r*c*h-i*l*h)+p*(+t*c*f-t*o*d-i*a*f+n*a*d+i*o*h-n*c*h)+m*(-r*o*h-t*l*f+t*o*u+r*a*f-n*a*u+n*l*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],l=e[6],c=e[7],h=e[8],f=e[9],u=e[10],d=e[11],g=e[12],_=e[13],p=e[14],m=e[15],M=f*p*c-_*u*c+_*l*d-o*p*d-f*l*m+o*u*m,v=g*u*c-h*p*c-g*l*d+a*p*d+h*l*m-a*u*m,b=h*_*c-g*f*c+g*o*d-a*_*d-h*o*m+a*f*m,R=g*f*l-h*_*l-g*o*u+a*_*u+h*o*p-a*f*p,w=t*M+n*v+r*b+i*R;if(w===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const T=1/w;return e[0]=M*T,e[1]=(_*u*i-f*p*i-_*r*d+n*p*d+f*r*m-n*u*m)*T,e[2]=(o*p*i-_*l*i+_*r*c-n*p*c-o*r*m+n*l*m)*T,e[3]=(f*l*i-o*u*i-f*r*c+n*u*c+o*r*d-n*l*d)*T,e[4]=v*T,e[5]=(h*p*i-g*u*i+g*r*d-t*p*d-h*r*m+t*u*m)*T,e[6]=(g*l*i-a*p*i-g*r*c+t*p*c+a*r*m-t*l*m)*T,e[7]=(a*u*i-h*l*i+h*r*c-t*u*c-a*r*d+t*l*d)*T,e[8]=b*T,e[9]=(g*f*i-h*_*i-g*n*d+t*_*d+h*n*m-t*f*m)*T,e[10]=(a*_*i-g*o*i+g*n*c-t*_*c-a*n*m+t*o*m)*T,e[11]=(h*o*i-a*f*i-h*n*c+t*f*c+a*n*d-t*o*d)*T,e[12]=R*T,e[13]=(h*_*r-g*f*r+g*n*u-t*_*u-h*n*p+t*f*p)*T,e[14]=(g*o*r-a*_*r-g*n*l+t*_*l+a*n*p-t*o*p)*T,e[15]=(a*f*r-h*o*r+h*n*l-t*f*l-a*n*u+t*o*u)*T,this}scale(e){const t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,l=e.z,c=i*a,h=i*o;return this.set(c*a+n,c*o-r*l,c*l+r*o,0,c*o+r*l,h*o+n,h*l-r*a,0,c*l-r*o,h*l+r*a,i*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){const r=this.elements,i=t._x,a=t._y,o=t._z,l=t._w,c=i+i,h=a+a,f=o+o,u=i*c,d=i*h,g=i*f,_=a*h,p=a*f,m=o*f,M=l*c,v=l*h,b=l*f,R=n.x,w=n.y,T=n.z;return r[0]=(1-(_+m))*R,r[1]=(d+b)*R,r[2]=(g-v)*R,r[3]=0,r[4]=(d-b)*w,r[5]=(1-(u+m))*w,r[6]=(p+M)*w,r[7]=0,r[8]=(g+v)*T,r[9]=(p-M)*T,r[10]=(1-(u+_))*T,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){const r=this.elements;let i=ui.set(r[0],r[1],r[2]).length();const a=ui.set(r[4],r[5],r[6]).length(),o=ui.set(r[8],r[9],r[10]).length();this.determinant()<0&&(i=-i),e.x=r[12],e.y=r[13],e.z=r[14],Qt.copy(this);const c=1/i,h=1/a,f=1/o;return Qt.elements[0]*=c,Qt.elements[1]*=c,Qt.elements[2]*=c,Qt.elements[4]*=h,Qt.elements[5]*=h,Qt.elements[6]*=h,Qt.elements[8]*=f,Qt.elements[9]*=f,Qt.elements[10]*=f,t.setFromRotationMatrix(Qt),n.x=i,n.y=a,n.z=o,this}makePerspective(e,t,n,r,i,a,o=xn){const l=this.elements,c=2*i/(t-e),h=2*i/(n-r),f=(t+e)/(t-e),u=(n+r)/(n-r);let d,g;if(o===xn)d=-(a+i)/(a-i),g=-2*a*i/(a-i);else if(o===ps)d=-a/(a-i),g=-a*i/(a-i);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=c,l[4]=0,l[8]=f,l[12]=0,l[1]=0,l[5]=h,l[9]=u,l[13]=0,l[2]=0,l[6]=0,l[10]=d,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=xn){const l=this.elements,c=1/(t-e),h=1/(n-r),f=1/(a-i),u=(t+e)*c,d=(n+r)*h;let g,_;if(o===xn)g=(a+i)*f,_=-2*f;else if(o===ps)g=i*f,_=-1*f;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-u,l[1]=0,l[5]=2*h,l[9]=0,l[13]=-d,l[2]=0,l[6]=0,l[10]=_,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<16;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}}const ui=new V,Qt=new it,Zu=new V(0,0,0),Ju=new V(1,1,1),Cn=new V,Dr=new V,Ot=new V,Ko=new it,Zo=new ei;class ln{constructor(e=0,t=0,n=0,r=ln.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const r=e.elements,i=r[0],a=r[4],o=r[8],l=r[1],c=r[5],h=r[9],f=r[2],u=r[6],d=r[10];switch(t){case"XYZ":this._y=Math.asin(Ct(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,d),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ct(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,d),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,i),this._z=0);break;case"ZXY":this._x=Math.asin(Ct(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-f,d),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,i));break;case"ZYX":this._y=Math.asin(-Ct(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(u,d),this._z=Math.atan2(l,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(Ct(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-f,i)):(this._x=0,this._y=Math.atan2(o,d));break;case"XZY":this._z=Math.asin(-Ct(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-h,d),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Ko.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Ko,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Zo.setFromEuler(this),this.setFromQuaternion(Zo,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}ln.DEFAULT_ORDER="XYZ";class Ga{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Qu=0;const Jo=new V,fi=new ei,dn=new it,Lr=new V,er=new V,$u=new V,ef=new ei,Qo=new V(1,0,0),$o=new V(0,1,0),el=new V(0,0,1),tl={type:"added"},tf={type:"removed"},di={type:"childadded",child:null},$s={type:"childremoved",child:null};class xt extends ti{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Qu++}),this.uuid=dr(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=xt.DEFAULT_UP.clone();const e=new V,t=new ln,n=new ei,r=new V(1,1,1);function i(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(i),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new it},normalMatrix:{value:new Ke}}),this.matrix=new it,this.matrixWorld=new it,this.matrixAutoUpdate=xt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=xt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Ga,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return fi.setFromAxisAngle(e,t),this.quaternion.multiply(fi),this}rotateOnWorldAxis(e,t){return fi.setFromAxisAngle(e,t),this.quaternion.premultiply(fi),this}rotateX(e){return this.rotateOnAxis(Qo,e)}rotateY(e){return this.rotateOnAxis($o,e)}rotateZ(e){return this.rotateOnAxis(el,e)}translateOnAxis(e,t){return Jo.copy(e).applyQuaternion(this.quaternion),this.position.add(Jo.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Qo,e)}translateY(e){return this.translateOnAxis($o,e)}translateZ(e){return this.translateOnAxis(el,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(dn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Lr.copy(e):Lr.set(e,t,n);const r=this.parent;this.updateWorldMatrix(!0,!1),er.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?dn.lookAt(er,Lr,this.up):dn.lookAt(Lr,er,this.up),this.quaternion.setFromRotationMatrix(dn),r&&(dn.extractRotation(r.matrixWorld),fi.setFromRotationMatrix(dn),this.quaternion.premultiply(fi.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(tl),di.child=e,this.dispatchEvent(di),di.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(tf),$s.child=e,this.dispatchEvent($s),$s.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),dn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),dn.multiply(e.parent.matrixWorld)),e.applyMatrix4(dn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(tl),di.child=e,this.dispatchEvent(di),di.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){const a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(er,e,$u),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(er,ef,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,r=t.length;n<r;n++){const i=t[n];(i.matrixWorldAutoUpdate===!0||e===!0)&&i.updateMatrixWorld(e)}}updateWorldMatrix(e,t){const n=this.parent;if(e===!0&&n!==null&&n.matrixWorldAutoUpdate===!0&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){const r=this.children;for(let i=0,a=r.length;i<a;i++){const o=r[i];o.matrixWorldAutoUpdate===!0&&o.updateWorldMatrix(!1,!0)}}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),r.maxGeometryCount=this._maxGeometryCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function i(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const f=l[c];i(e.shapes,f)}else i(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(i(e.materials,this.material[l]));r.material=o}else r.material=i(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];r.animations.push(i(e.animations,l))}}if(t){const o=a(e.geometries),l=a(e.materials),c=a(e.textures),h=a(e.images),f=a(e.shapes),u=a(e.skeletons),d=a(e.animations),g=a(e.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),f.length>0&&(n.shapes=f),u.length>0&&(n.skeletons=u),d.length>0&&(n.animations=d),g.length>0&&(n.nodes=g)}return n.object=r,n;function a(o){const l=[];for(const c in o){const h=o[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const r=e.children[n];this.add(r.clone())}return this}}xt.DEFAULT_UP=new V(0,1,0);xt.DEFAULT_MATRIX_AUTO_UPDATE=!0;xt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const $t=new V,pn=new V,ea=new V,mn=new V,pi=new V,mi=new V,nl=new V,ta=new V,na=new V,ia=new V;class an{constructor(e=new V,t=new V,n=new V){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),$t.subVectors(e,t),r.cross($t);const i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){$t.subVectors(r,t),pn.subVectors(n,t),ea.subVectors(e,t);const a=$t.dot($t),o=$t.dot(pn),l=$t.dot(ea),c=pn.dot(pn),h=pn.dot(ea),f=a*c-o*o;if(f===0)return i.set(0,0,0),null;const u=1/f,d=(c*l-o*h)*u,g=(a*h-o*l)*u;return i.set(1-d-g,g,d)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,mn)===null?!1:mn.x>=0&&mn.y>=0&&mn.x+mn.y<=1}static getInterpolation(e,t,n,r,i,a,o,l){return this.getBarycoord(e,t,n,r,mn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(i,mn.x),l.addScaledVector(a,mn.y),l.addScaledVector(o,mn.z),l)}static isFrontFacing(e,t,n,r){return $t.subVectors(n,t),pn.subVectors(e,t),$t.cross(pn).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return $t.subVectors(this.c,this.b),pn.subVectors(this.a,this.b),$t.cross(pn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return an.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return an.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,r,i){return an.getInterpolation(e,this.a,this.b,this.c,t,n,r,i)}containsPoint(e){return an.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return an.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,r=this.b,i=this.c;let a,o;pi.subVectors(r,n),mi.subVectors(i,n),ta.subVectors(e,n);const l=pi.dot(ta),c=mi.dot(ta);if(l<=0&&c<=0)return t.copy(n);na.subVectors(e,r);const h=pi.dot(na),f=mi.dot(na);if(h>=0&&f<=h)return t.copy(r);const u=l*f-h*c;if(u<=0&&l>=0&&h<=0)return a=l/(l-h),t.copy(n).addScaledVector(pi,a);ia.subVectors(e,i);const d=pi.dot(ia),g=mi.dot(ia);if(g>=0&&d<=g)return t.copy(i);const _=d*c-l*g;if(_<=0&&c>=0&&g<=0)return o=c/(c-g),t.copy(n).addScaledVector(mi,o);const p=h*g-d*f;if(p<=0&&f-h>=0&&d-g>=0)return nl.subVectors(i,r),o=(f-h)/(f-h+(d-g)),t.copy(r).addScaledVector(nl,o);const m=1/(p+_+u);return a=_*m,o=u*m,t.copy(n).addScaledVector(pi,a).addScaledVector(mi,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const Dc={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Rn={h:0,s:0,l:0},Ir={h:0,s:0,l:0};function ra(s,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?s+(e-s)*6*t:t<1/2?e:t<2/3?s+(e-s)*6*(2/3-t):s}class Ye{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=nn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,nt.toWorkingColorSpace(this,t),this}setRGB(e,t,n,r=nt.workingColorSpace){return this.r=e,this.g=t,this.b=n,nt.toWorkingColorSpace(this,r),this}setHSL(e,t,n,r=nt.workingColorSpace){if(e=ku(e,1),t=Ct(t,0,1),n=Ct(n,0,1),t===0)this.r=this.g=this.b=n;else{const i=n<=.5?n*(1+t):n+t-n*t,a=2*n-i;this.r=ra(a,i,e+1/3),this.g=ra(a,i,e),this.b=ra(a,i,e-1/3)}return nt.toWorkingColorSpace(this,r),this}setStyle(e,t=nn){function n(i){i!==void 0&&parseFloat(i)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseInt(i[1],10))/100,Math.min(100,parseInt(i[2],10))/100,Math.min(100,parseInt(i[3],10))/100,t);break;case"hsl":case"hsla":if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const i=r[1],a=i.length;if(a===3)return this.setRGB(parseInt(i.charAt(0),16)/15,parseInt(i.charAt(1),16)/15,parseInt(i.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(i,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=nn){const n=Dc[e.toLowerCase()];return n!==void 0?this.setHex(n,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ri(e.r),this.g=Ri(e.g),this.b=Ri(e.b),this}copyLinearToSRGB(e){return this.r=Xs(e.r),this.g=Xs(e.g),this.b=Xs(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=nn){return nt.fromWorkingColorSpace(Et.copy(this),e),Math.round(Ct(Et.r*255,0,255))*65536+Math.round(Ct(Et.g*255,0,255))*256+Math.round(Ct(Et.b*255,0,255))}getHexString(e=nn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=nt.workingColorSpace){nt.fromWorkingColorSpace(Et.copy(this),t);const n=Et.r,r=Et.g,i=Et.b,a=Math.max(n,r,i),o=Math.min(n,r,i);let l,c;const h=(o+a)/2;if(o===a)l=0,c=0;else{const f=a-o;switch(c=h<=.5?f/(a+o):f/(2-a-o),a){case n:l=(r-i)/f+(r<i?6:0);break;case r:l=(i-n)/f+2;break;case i:l=(n-r)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=nt.workingColorSpace){return nt.fromWorkingColorSpace(Et.copy(this),t),e.r=Et.r,e.g=Et.g,e.b=Et.b,e}getStyle(e=nn){nt.fromWorkingColorSpace(Et.copy(this),e);const t=Et.r,n=Et.g,r=Et.b;return e!==nn?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(e,t,n){return this.getHSL(Rn),this.setHSL(Rn.h+e,Rn.s+t,Rn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Rn),e.getHSL(Ir);const n=Vs(Rn.h,Ir.h,t),r=Vs(Rn.s,Ir.s,t),i=Vs(Rn.l,Ir.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Et=new Ye;Ye.NAMES=Dc;let nf=0;class Bi extends ti{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:nf++}),this.uuid=dr(),this.name="",this.type="Material",this.blending=Ai,this.side=Nn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Sa,this.blendDst=Ma,this.blendEquation=Kn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ye(0,0,0),this.blendAlpha=0,this.depthFunc=cs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Ho,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=ai,this.stencilZFail=ai,this.stencilZPass=ai,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Ai&&(n.blending=this.blending),this.side!==Nn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Sa&&(n.blendSrc=this.blendSrc),this.blendDst!==Ma&&(n.blendDst=this.blendDst),this.blendEquation!==Kn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==cs&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Ho&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==ai&&(n.stencilFail=this.stencilFail),this.stencilZFail!==ai&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==ai&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(i){const a=[];for(const o in i){const l=i[o];delete l.metadata,a.push(l)}return a}if(t){const i=r(e.textures),a=r(e.images);i.length>0&&(n.textures=i),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const r=t.length;n=new Array(r);for(let i=0;i!==r;++i)n[i]=t[i].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class pr extends Bi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ye(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ln,this.combine=gc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const ct=new V,Fr=new Oe;class jt{constructor(e,t,n=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Vo,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=vn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return Rc("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Fr.fromBufferAttribute(this,t),Fr.applyMatrix3(e),this.setXY(t,Fr.x,Fr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)ct.fromBufferAttribute(this,t),ct.applyMatrix3(e),this.setXYZ(t,ct.x,ct.y,ct.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)ct.fromBufferAttribute(this,t),ct.applyMatrix4(e),this.setXYZ(t,ct.x,ct.y,ct.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)ct.fromBufferAttribute(this,t),ct.applyNormalMatrix(e),this.setXYZ(t,ct.x,ct.y,ct.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)ct.fromBufferAttribute(this,t),ct.transformDirection(e),this.setXYZ(t,ct.x,ct.y,ct.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Ji(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Dt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ji(t,this.array)),t}setX(e,t){return this.normalized&&(t=Dt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ji(t,this.array)),t}setY(e,t){return this.normalized&&(t=Dt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ji(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Dt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ji(t,this.array)),t}setW(e,t){return this.normalized&&(t=Dt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Dt(t,this.array),n=Dt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=Dt(t,this.array),n=Dt(n,this.array),r=Dt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=Dt(t,this.array),n=Dt(n,this.array),r=Dt(r,this.array),i=Dt(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Vo&&(e.usage=this.usage),e}}class Lc extends jt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Ic extends jt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class yt extends jt{constructor(e,t,n){super(new Float32Array(e),t,n)}}let rf=0;const Xt=new it,sa=new xt,gi=new V,Bt=new Sn,tr=new Sn,mt=new V;class zt extends ti{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:rf++}),this.uuid=dr(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Cc(e)?Ic:Lc)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const i=new Ke().getNormalMatrix(e);n.applyNormalMatrix(i),n.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Xt.makeRotationFromQuaternion(e),this.applyMatrix4(Xt),this}rotateX(e){return Xt.makeRotationX(e),this.applyMatrix4(Xt),this}rotateY(e){return Xt.makeRotationY(e),this.applyMatrix4(Xt),this}rotateZ(e){return Xt.makeRotationZ(e),this.applyMatrix4(Xt),this}translate(e,t,n){return Xt.makeTranslation(e,t,n),this.applyMatrix4(Xt),this}scale(e,t,n){return Xt.makeScale(e,t,n),this.applyMatrix4(Xt),this}lookAt(e){return sa.lookAt(e),sa.updateMatrix(),this.applyMatrix4(sa.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(gi).negate(),this.translate(gi.x,gi.y,gi.z),this}setFromPoints(e){const t=[];for(let n=0,r=e.length;n<r;n++){const i=e[n];t.push(i.x,i.y,i.z||0)}return this.setAttribute("position",new yt(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Sn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new V(-1/0,-1/0,-1/0),new V(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,r=t.length;n<r;n++){const i=t[n];Bt.setFromBufferAttribute(i),this.morphTargetsRelative?(mt.addVectors(this.boundingBox.min,Bt.min),this.boundingBox.expandByPoint(mt),mt.addVectors(this.boundingBox.max,Bt.max),this.boundingBox.expandByPoint(mt)):(this.boundingBox.expandByPoint(Bt.min),this.boundingBox.expandByPoint(Bt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ni);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new V,1/0);return}if(e){const n=this.boundingSphere.center;if(Bt.setFromBufferAttribute(e),t)for(let i=0,a=t.length;i<a;i++){const o=t[i];tr.setFromBufferAttribute(o),this.morphTargetsRelative?(mt.addVectors(Bt.min,tr.min),Bt.expandByPoint(mt),mt.addVectors(Bt.max,tr.max),Bt.expandByPoint(mt)):(Bt.expandByPoint(tr.min),Bt.expandByPoint(tr.max))}Bt.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)mt.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(mt));if(t)for(let i=0,a=t.length;i<a;i++){const o=t[i],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)mt.fromBufferAttribute(o,c),l&&(gi.fromBufferAttribute(e,c),mt.add(gi)),r=Math.max(r,n.distanceToSquared(mt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,r=t.normal,i=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new jt(new Float32Array(4*n.count),4));const a=this.getAttribute("tangent"),o=[],l=[];for(let P=0;P<n.count;P++)o[P]=new V,l[P]=new V;const c=new V,h=new V,f=new V,u=new Oe,d=new Oe,g=new Oe,_=new V,p=new V;function m(P,E,y){c.fromBufferAttribute(n,P),h.fromBufferAttribute(n,E),f.fromBufferAttribute(n,y),u.fromBufferAttribute(i,P),d.fromBufferAttribute(i,E),g.fromBufferAttribute(i,y),h.sub(c),f.sub(c),d.sub(u),g.sub(u);const L=1/(d.x*g.y-g.x*d.y);isFinite(L)&&(_.copy(h).multiplyScalar(g.y).addScaledVector(f,-d.y).multiplyScalar(L),p.copy(f).multiplyScalar(d.x).addScaledVector(h,-g.x).multiplyScalar(L),o[P].add(_),o[E].add(_),o[y].add(_),l[P].add(p),l[E].add(p),l[y].add(p))}let M=this.groups;M.length===0&&(M=[{start:0,count:e.count}]);for(let P=0,E=M.length;P<E;++P){const y=M[P],L=y.start,U=y.count;for(let I=L,N=L+U;I<N;I+=3)m(e.getX(I+0),e.getX(I+1),e.getX(I+2))}const v=new V,b=new V,R=new V,w=new V;function T(P){R.fromBufferAttribute(r,P),w.copy(R);const E=o[P];v.copy(E),v.sub(R.multiplyScalar(R.dot(E))).normalize(),b.crossVectors(w,E);const L=b.dot(l[P])<0?-1:1;a.setXYZW(P,v.x,v.y,v.z,L)}for(let P=0,E=M.length;P<E;++P){const y=M[P],L=y.start,U=y.count;for(let I=L,N=L+U;I<N;I+=3)T(e.getX(I+0)),T(e.getX(I+1)),T(e.getX(I+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new jt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let u=0,d=n.count;u<d;u++)n.setXYZ(u,0,0,0);const r=new V,i=new V,a=new V,o=new V,l=new V,c=new V,h=new V,f=new V;if(e)for(let u=0,d=e.count;u<d;u+=3){const g=e.getX(u+0),_=e.getX(u+1),p=e.getX(u+2);r.fromBufferAttribute(t,g),i.fromBufferAttribute(t,_),a.fromBufferAttribute(t,p),h.subVectors(a,i),f.subVectors(r,i),h.cross(f),o.fromBufferAttribute(n,g),l.fromBufferAttribute(n,_),c.fromBufferAttribute(n,p),o.add(h),l.add(h),c.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(_,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let u=0,d=t.count;u<d;u+=3)r.fromBufferAttribute(t,u+0),i.fromBufferAttribute(t,u+1),a.fromBufferAttribute(t,u+2),h.subVectors(a,i),f.subVectors(r,i),h.cross(f),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)mt.fromBufferAttribute(e,t),mt.normalize(),e.setXYZ(t,mt.x,mt.y,mt.z)}toNonIndexed(){function e(o,l){const c=o.array,h=o.itemSize,f=o.normalized,u=new c.constructor(l.length*h);let d=0,g=0;for(let _=0,p=l.length;_<p;_++){o.isInterleavedBufferAttribute?d=l[_]*o.data.stride+o.offset:d=l[_]*h;for(let m=0;m<h;m++)u[g++]=c[d++]}return new jt(u,h,f)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new zt,n=this.index.array,r=this.attributes;for(const o in r){const l=r[o],c=e(l,n);t.setAttribute(o,c)}const i=this.morphAttributes;for(const o in i){const l=[],c=i[o];for(let h=0,f=c.length;h<f;h++){const u=c[h],d=e(u,n);l.push(d)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const r={};let i=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let f=0,u=c.length;f<u;f++){const d=c[f];h.push(d.toJSON(e.data))}h.length>0&&(r[l]=h,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone(t));const r=e.attributes;for(const c in r){const h=r[c];this.setAttribute(c,h.clone(t))}const i=e.morphAttributes;for(const c in i){const h=[],f=i[c];for(let u=0,d=f.length;u<d;u++)h.push(f[u].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let c=0,h=a.length;c<h;c++){const f=a[c];this.addGroup(f.start,f.count,f.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const il=new it,Vn=new ys,Nr=new ni,rl=new V,_i=new V,vi=new V,xi=new V,aa=new V,Or=new V,Br=new Oe,kr=new Oe,zr=new Oe,sl=new V,al=new V,ol=new V,Gr=new V,Hr=new V;class Rt extends xt{constructor(e=new zt,t=new pr){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let i=0,a=r.length;i<a;i++){const o=r[i].name||String(i);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=i}}}}getVertexPosition(e,t){const n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);const o=this.morphTargetInfluences;if(i&&o){Or.set(0,0,0);for(let l=0,c=i.length;l<c;l++){const h=o[l],f=i[l];h!==0&&(aa.fromBufferAttribute(f,e),a?Or.addScaledVector(aa,h):Or.addScaledVector(aa.sub(t),h))}t.add(Or)}return t}raycast(e,t){const n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Nr.copy(n.boundingSphere),Nr.applyMatrix4(i),Vn.copy(e.ray).recast(e.near),!(Nr.containsPoint(Vn.origin)===!1&&(Vn.intersectSphere(Nr,rl)===null||Vn.origin.distanceToSquared(rl)>(e.far-e.near)**2))&&(il.copy(i).invert(),Vn.copy(e.ray).applyMatrix4(il),!(n.boundingBox!==null&&Vn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Vn)))}_computeIntersections(e,t,n){let r;const i=this.geometry,a=this.material,o=i.index,l=i.attributes.position,c=i.attributes.uv,h=i.attributes.uv1,f=i.attributes.normal,u=i.groups,d=i.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,_=u.length;g<_;g++){const p=u[g],m=a[p.materialIndex],M=Math.max(p.start,d.start),v=Math.min(o.count,Math.min(p.start+p.count,d.start+d.count));for(let b=M,R=v;b<R;b+=3){const w=o.getX(b),T=o.getX(b+1),P=o.getX(b+2);r=Vr(this,m,e,n,c,h,f,w,T,P),r&&(r.faceIndex=Math.floor(b/3),r.face.materialIndex=p.materialIndex,t.push(r))}}else{const g=Math.max(0,d.start),_=Math.min(o.count,d.start+d.count);for(let p=g,m=_;p<m;p+=3){const M=o.getX(p),v=o.getX(p+1),b=o.getX(p+2);r=Vr(this,a,e,n,c,h,f,M,v,b),r&&(r.faceIndex=Math.floor(p/3),t.push(r))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,_=u.length;g<_;g++){const p=u[g],m=a[p.materialIndex],M=Math.max(p.start,d.start),v=Math.min(l.count,Math.min(p.start+p.count,d.start+d.count));for(let b=M,R=v;b<R;b+=3){const w=b,T=b+1,P=b+2;r=Vr(this,m,e,n,c,h,f,w,T,P),r&&(r.faceIndex=Math.floor(b/3),r.face.materialIndex=p.materialIndex,t.push(r))}}else{const g=Math.max(0,d.start),_=Math.min(l.count,d.start+d.count);for(let p=g,m=_;p<m;p+=3){const M=p,v=p+1,b=p+2;r=Vr(this,a,e,n,c,h,f,M,v,b),r&&(r.faceIndex=Math.floor(p/3),t.push(r))}}}}function sf(s,e,t,n,r,i,a,o){let l;if(e.side===Ft?l=n.intersectTriangle(a,i,r,!0,o):l=n.intersectTriangle(r,i,a,e.side===Nn,o),l===null)return null;Hr.copy(o),Hr.applyMatrix4(s.matrixWorld);const c=t.ray.origin.distanceTo(Hr);return c<t.near||c>t.far?null:{distance:c,point:Hr.clone(),object:s}}function Vr(s,e,t,n,r,i,a,o,l,c){s.getVertexPosition(o,_i),s.getVertexPosition(l,vi),s.getVertexPosition(c,xi);const h=sf(s,e,t,n,_i,vi,xi,Gr);if(h){r&&(Br.fromBufferAttribute(r,o),kr.fromBufferAttribute(r,l),zr.fromBufferAttribute(r,c),h.uv=an.getInterpolation(Gr,_i,vi,xi,Br,kr,zr,new Oe)),i&&(Br.fromBufferAttribute(i,o),kr.fromBufferAttribute(i,l),zr.fromBufferAttribute(i,c),h.uv1=an.getInterpolation(Gr,_i,vi,xi,Br,kr,zr,new Oe)),a&&(sl.fromBufferAttribute(a,o),al.fromBufferAttribute(a,l),ol.fromBufferAttribute(a,c),h.normal=an.getInterpolation(Gr,_i,vi,xi,sl,al,ol,new V),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const f={a:o,b:l,c,normal:new V,materialIndex:0};an.getNormal(_i,vi,xi,f.normal),h.face=f}return h}class ki extends zt{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};const o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);const l=[],c=[],h=[],f=[];let u=0,d=0;g("z","y","x",-1,-1,n,t,e,a,i,0),g("z","y","x",1,-1,n,t,-e,a,i,1),g("x","z","y",1,1,e,n,t,r,a,2),g("x","z","y",1,-1,e,n,-t,r,a,3),g("x","y","z",1,-1,e,t,n,r,i,4),g("x","y","z",-1,-1,e,t,-n,r,i,5),this.setIndex(l),this.setAttribute("position",new yt(c,3)),this.setAttribute("normal",new yt(h,3)),this.setAttribute("uv",new yt(f,2));function g(_,p,m,M,v,b,R,w,T,P,E){const y=b/T,L=R/P,U=b/2,I=R/2,N=w/2,W=T+1,k=P+1;let se=0,j=0;const K=new V;for(let q=0;q<k;q++){const F=q*L-I;for(let H=0;H<W;H++){const ne=H*y-U;K[_]=ne*M,K[p]=F*v,K[m]=N,c.push(K.x,K.y,K.z),K[_]=0,K[p]=0,K[m]=w>0?1:-1,h.push(K.x,K.y,K.z),f.push(H/T),f.push(1-q/P),se+=1}}for(let q=0;q<P;q++)for(let F=0;F<T;F++){const H=u+F+W*q,ne=u+F+W*(q+1),O=u+(F+1)+W*(q+1),B=u+(F+1)+W*q;l.push(H,ne,B),l.push(ne,O,B),j+=6}o.addGroup(d,j,E),d+=j,u+=se}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ki(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Ni(s){const e={};for(const t in s){e[t]={};for(const n in s[t]){const r=s[t][n];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=r.clone():Array.isArray(r)?e[t][n]=r.slice():e[t][n]=r}}return e}function At(s){const e={};for(let t=0;t<s.length;t++){const n=Ni(s[t]);for(const r in n)e[r]=n[r]}return e}function af(s){const e=[];for(let t=0;t<s.length;t++)e.push(s[t].clone());return e}function Fc(s){const e=s.getRenderTarget();return e===null?s.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:nt.workingColorSpace}const fr={clone:Ni,merge:At};var of=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,lf=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class It extends Bi{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=of,this.fragmentShader=lf,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Ni(e.uniforms),this.uniformsGroups=af(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}}class Nc extends xt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new it,this.projectionMatrix=new it,this.projectionMatrixInverse=new it,this.coordinateSystem=xn}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Pn=new V,ll=new Oe,cl=new Oe;class Yt extends Nc{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Aa*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(is*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Aa*2*Math.atan(Math.tan(is*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Pn.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Pn.x,Pn.y).multiplyScalar(-e/Pn.z),Pn.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Pn.x,Pn.y).multiplyScalar(-e/Pn.z)}getViewSize(e,t){return this.getViewBounds(e,ll,cl),t.subVectors(cl,ll)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(is*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;i+=a.offsetX*r/l,t-=a.offsetY*n/c,r*=a.width/l,n*=a.height/c}const o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const yi=-90,Si=1;class cf extends xt{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Yt(yi,Si,e,t);r.layers=this.layers,this.add(r);const i=new Yt(yi,Si,e,t);i.layers=this.layers,this.add(i);const a=new Yt(yi,Si,e,t);a.layers=this.layers,this.add(a);const o=new Yt(yi,Si,e,t);o.layers=this.layers,this.add(o);const l=new Yt(yi,Si,e,t);l.layers=this.layers,this.add(l);const c=new Yt(yi,Si,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,l]=t;for(const c of t)this.remove(c);if(e===xn)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===ps)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[i,a,o,l,c,h]=this.children,f=e.getRenderTarget(),u=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,r),e.render(t,i),e.setRenderTarget(n,1,r),e.render(t,a),e.setRenderTarget(n,2,r),e.render(t,o),e.setRenderTarget(n,3,r),e.render(t,l),e.setRenderTarget(n,4,r),e.render(t,c),n.texture.generateMipmaps=_,e.setRenderTarget(n,5,r),e.render(t,h),e.setRenderTarget(f,u,d),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class Oc extends Tt{constructor(e,t,n,r,i,a,o,l,c,h){e=e!==void 0?e:[],t=t!==void 0?t:Ui,super(e,t,n,r,i,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class hf extends en{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new Oc(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:kt}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new ki(5,5,5),i=new It({name:"CubemapFromEquirect",uniforms:Ni(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Ft,blending:yn});i.uniforms.tEquirect.value=t;const a=new Rt(r,i),o=t.minFilter;return t.minFilter===Qn&&(t.minFilter=kt),new cf(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,n,r){const i=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,r);e.setRenderTarget(i)}}const oa=new V,uf=new V,ff=new Ke;class Dn{constructor(e=new V(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const r=oa.subVectors(n,t).cross(uf.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const n=e.delta(oa),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const i=-(e.start.dot(this.normal)+this.constant)/r;return i<0||i>1?null:t.copy(e.start).addScaledVector(n,i)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||ff.getNormalMatrix(e),r=this.coplanarPoint(oa).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Wn=new ni,Wr=new V;class Ha{constructor(e=new Dn,t=new Dn,n=new Dn,r=new Dn,i=new Dn,a=new Dn){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=xn){const n=this.planes,r=e.elements,i=r[0],a=r[1],o=r[2],l=r[3],c=r[4],h=r[5],f=r[6],u=r[7],d=r[8],g=r[9],_=r[10],p=r[11],m=r[12],M=r[13],v=r[14],b=r[15];if(n[0].setComponents(l-i,u-c,p-d,b-m).normalize(),n[1].setComponents(l+i,u+c,p+d,b+m).normalize(),n[2].setComponents(l+a,u+h,p+g,b+M).normalize(),n[3].setComponents(l-a,u-h,p-g,b-M).normalize(),n[4].setComponents(l-o,u-f,p-_,b-v).normalize(),t===xn)n[5].setComponents(l+o,u+f,p+_,b+v).normalize();else if(t===ps)n[5].setComponents(o,f,_,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Wn.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Wn.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Wn)}intersectsSprite(e){return Wn.center.set(0,0,0),Wn.radius=.7071067811865476,Wn.applyMatrix4(e.matrixWorld),this.intersectsSphere(Wn)}intersectsSphere(e){const t=this.planes,n=e.center,r=-e.radius;for(let i=0;i<6;i++)if(t[i].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const r=t[n];if(Wr.x=r.normal.x>0?e.max.x:e.min.x,Wr.y=r.normal.y>0?e.max.y:e.min.y,Wr.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Wr)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function Bc(){let s=null,e=!1,t=null,n=null;function r(i,a){t(i,a),n=s.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(n=s.requestAnimationFrame(r),e=!0)},stop:function(){s.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(i){t=i},setContext:function(i){s=i}}}function df(s){const e=new WeakMap;function t(o,l){const c=o.array,h=o.usage,f=c.byteLength,u=s.createBuffer();s.bindBuffer(l,u),s.bufferData(l,c,h),o.onUploadCallback();let d;if(c instanceof Float32Array)d=s.FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?d=s.HALF_FLOAT:d=s.UNSIGNED_SHORT;else if(c instanceof Int16Array)d=s.SHORT;else if(c instanceof Uint32Array)d=s.UNSIGNED_INT;else if(c instanceof Int32Array)d=s.INT;else if(c instanceof Int8Array)d=s.BYTE;else if(c instanceof Uint8Array)d=s.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)d=s.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:d,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:f}}function n(o,l,c){const h=l.array,f=l._updateRange,u=l.updateRanges;if(s.bindBuffer(c,o),f.count===-1&&u.length===0&&s.bufferSubData(c,0,h),u.length!==0){for(let d=0,g=u.length;d<g;d++){const _=u[d];s.bufferSubData(c,_.start*h.BYTES_PER_ELEMENT,h,_.start,_.count)}l.clearUpdateRanges()}f.count!==-1&&(s.bufferSubData(c,f.offset*h.BYTES_PER_ELEMENT,h,f.offset,f.count),f.count=-1),l.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function i(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=e.get(o);l&&(s.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isGLBufferAttribute){const h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}o.isInterleavedBufferAttribute&&(o=o.data);const c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,o,l),c.version=o.version}}return{get:r,remove:i,update:a}}class ii extends zt{constructor(e=1,t=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};const i=e/2,a=t/2,o=Math.floor(n),l=Math.floor(r),c=o+1,h=l+1,f=e/o,u=t/l,d=[],g=[],_=[],p=[];for(let m=0;m<h;m++){const M=m*u-a;for(let v=0;v<c;v++){const b=v*f-i;g.push(b,-M,0),_.push(0,0,1),p.push(v/o),p.push(1-m/l)}}for(let m=0;m<l;m++)for(let M=0;M<o;M++){const v=M+c*m,b=M+c*(m+1),R=M+1+c*(m+1),w=M+1+c*m;d.push(v,b,w),d.push(b,R,w)}this.setIndex(d),this.setAttribute("position",new yt(g,3)),this.setAttribute("normal",new yt(_,3)),this.setAttribute("uv",new yt(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ii(e.width,e.height,e.widthSegments,e.heightSegments)}}var pf=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,mf=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,gf=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,_f=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,vf=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,xf=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,yf=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Sf=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Mf=`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,bf=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,Ef=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Tf=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,wf=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Af=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Cf=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Rf=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Pf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Uf=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Df=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Lf=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,If=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Ff=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Nf=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( batchId );
	vColor.xyz *= batchingColor.xyz;
#endif`,Of=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Bf=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,kf=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,zf=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Gf=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Hf=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Vf=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Wf="gl_FragColor = linearToOutputTexel( gl_FragColor );",Xf=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,Yf=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,jf=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,qf=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Kf=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Zf=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Jf=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Qf=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,$f=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,ed=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,td=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,nd=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,id=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,rd=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,sd=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,ad=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,od=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,ld=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,cd=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,hd=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,ud=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,fd=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,dd=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,pd=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,md=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,gd=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,_d=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,vd=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,xd=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,yd=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Sd=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Md=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,bd=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Ed=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Td=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,wd=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Ad=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Cd=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Rd=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Pd=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Ud=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Dd=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Ld=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Id=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Fd=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Nd=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Od=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Bd=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,kd=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,zd=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Gd=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Hd=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,Vd=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Wd=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Xd=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Yd=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,jd=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,qd=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Kd=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return shadow;
	}
#endif`,Zd=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Jd=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Qd=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,$d=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,ep=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,tp=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,np=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,ip=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,rp=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,sp=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,ap=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,op=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,lp=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,cp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,hp=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,up=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,fp=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const dp=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,pp=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,mp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,gp=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,_p=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,vp=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,xp=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,yp=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,Sp=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Mp=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,bp=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Ep=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Tp=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,wp=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ap=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Cp=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rp=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Pp=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Up=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Dp=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Lp=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Ip=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Fp=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Np=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Op=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Bp=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kp=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,zp=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Gp=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Hp=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Vp=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Wp=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Xp=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Yp=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,qe={alphahash_fragment:pf,alphahash_pars_fragment:mf,alphamap_fragment:gf,alphamap_pars_fragment:_f,alphatest_fragment:vf,alphatest_pars_fragment:xf,aomap_fragment:yf,aomap_pars_fragment:Sf,batching_pars_vertex:Mf,batching_vertex:bf,begin_vertex:Ef,beginnormal_vertex:Tf,bsdfs:wf,iridescence_fragment:Af,bumpmap_pars_fragment:Cf,clipping_planes_fragment:Rf,clipping_planes_pars_fragment:Pf,clipping_planes_pars_vertex:Uf,clipping_planes_vertex:Df,color_fragment:Lf,color_pars_fragment:If,color_pars_vertex:Ff,color_vertex:Nf,common:Of,cube_uv_reflection_fragment:Bf,defaultnormal_vertex:kf,displacementmap_pars_vertex:zf,displacementmap_vertex:Gf,emissivemap_fragment:Hf,emissivemap_pars_fragment:Vf,colorspace_fragment:Wf,colorspace_pars_fragment:Xf,envmap_fragment:Yf,envmap_common_pars_fragment:jf,envmap_pars_fragment:qf,envmap_pars_vertex:Kf,envmap_physical_pars_fragment:ad,envmap_vertex:Zf,fog_vertex:Jf,fog_pars_vertex:Qf,fog_fragment:$f,fog_pars_fragment:ed,gradientmap_pars_fragment:td,lightmap_pars_fragment:nd,lights_lambert_fragment:id,lights_lambert_pars_fragment:rd,lights_pars_begin:sd,lights_toon_fragment:od,lights_toon_pars_fragment:ld,lights_phong_fragment:cd,lights_phong_pars_fragment:hd,lights_physical_fragment:ud,lights_physical_pars_fragment:fd,lights_fragment_begin:dd,lights_fragment_maps:pd,lights_fragment_end:md,logdepthbuf_fragment:gd,logdepthbuf_pars_fragment:_d,logdepthbuf_pars_vertex:vd,logdepthbuf_vertex:xd,map_fragment:yd,map_pars_fragment:Sd,map_particle_fragment:Md,map_particle_pars_fragment:bd,metalnessmap_fragment:Ed,metalnessmap_pars_fragment:Td,morphinstance_vertex:wd,morphcolor_vertex:Ad,morphnormal_vertex:Cd,morphtarget_pars_vertex:Rd,morphtarget_vertex:Pd,normal_fragment_begin:Ud,normal_fragment_maps:Dd,normal_pars_fragment:Ld,normal_pars_vertex:Id,normal_vertex:Fd,normalmap_pars_fragment:Nd,clearcoat_normal_fragment_begin:Od,clearcoat_normal_fragment_maps:Bd,clearcoat_pars_fragment:kd,iridescence_pars_fragment:zd,opaque_fragment:Gd,packing:Hd,premultiplied_alpha_fragment:Vd,project_vertex:Wd,dithering_fragment:Xd,dithering_pars_fragment:Yd,roughnessmap_fragment:jd,roughnessmap_pars_fragment:qd,shadowmap_pars_fragment:Kd,shadowmap_pars_vertex:Zd,shadowmap_vertex:Jd,shadowmask_pars_fragment:Qd,skinbase_vertex:$d,skinning_pars_vertex:ep,skinning_vertex:tp,skinnormal_vertex:np,specularmap_fragment:ip,specularmap_pars_fragment:rp,tonemapping_fragment:sp,tonemapping_pars_fragment:ap,transmission_fragment:op,transmission_pars_fragment:lp,uv_pars_fragment:cp,uv_pars_vertex:hp,uv_vertex:up,worldpos_vertex:fp,background_vert:dp,background_frag:pp,backgroundCube_vert:mp,backgroundCube_frag:gp,cube_vert:_p,cube_frag:vp,depth_vert:xp,depth_frag:yp,distanceRGBA_vert:Sp,distanceRGBA_frag:Mp,equirect_vert:bp,equirect_frag:Ep,linedashed_vert:Tp,linedashed_frag:wp,meshbasic_vert:Ap,meshbasic_frag:Cp,meshlambert_vert:Rp,meshlambert_frag:Pp,meshmatcap_vert:Up,meshmatcap_frag:Dp,meshnormal_vert:Lp,meshnormal_frag:Ip,meshphong_vert:Fp,meshphong_frag:Np,meshphysical_vert:Op,meshphysical_frag:Bp,meshtoon_vert:kp,meshtoon_frag:zp,points_vert:Gp,points_frag:Hp,shadow_vert:Vp,shadow_frag:Wp,sprite_vert:Xp,sprite_frag:Yp},De={common:{diffuse:{value:new Ye(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ke},alphaMap:{value:null},alphaMapTransform:{value:new Ke},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ke}},envmap:{envMap:{value:null},envMapRotation:{value:new Ke},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ke}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ke}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ke},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ke},normalScale:{value:new Oe(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ke},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ke}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ke}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ke}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ye(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Ye(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ke},alphaTest:{value:0},uvTransform:{value:new Ke}},sprite:{diffuse:{value:new Ye(16777215)},opacity:{value:1},center:{value:new Oe(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ke},alphaMap:{value:null},alphaMapTransform:{value:new Ke},alphaTest:{value:0}}},rn={basic:{uniforms:At([De.common,De.specularmap,De.envmap,De.aomap,De.lightmap,De.fog]),vertexShader:qe.meshbasic_vert,fragmentShader:qe.meshbasic_frag},lambert:{uniforms:At([De.common,De.specularmap,De.envmap,De.aomap,De.lightmap,De.emissivemap,De.bumpmap,De.normalmap,De.displacementmap,De.fog,De.lights,{emissive:{value:new Ye(0)}}]),vertexShader:qe.meshlambert_vert,fragmentShader:qe.meshlambert_frag},phong:{uniforms:At([De.common,De.specularmap,De.envmap,De.aomap,De.lightmap,De.emissivemap,De.bumpmap,De.normalmap,De.displacementmap,De.fog,De.lights,{emissive:{value:new Ye(0)},specular:{value:new Ye(1118481)},shininess:{value:30}}]),vertexShader:qe.meshphong_vert,fragmentShader:qe.meshphong_frag},standard:{uniforms:At([De.common,De.envmap,De.aomap,De.lightmap,De.emissivemap,De.bumpmap,De.normalmap,De.displacementmap,De.roughnessmap,De.metalnessmap,De.fog,De.lights,{emissive:{value:new Ye(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:qe.meshphysical_vert,fragmentShader:qe.meshphysical_frag},toon:{uniforms:At([De.common,De.aomap,De.lightmap,De.emissivemap,De.bumpmap,De.normalmap,De.displacementmap,De.gradientmap,De.fog,De.lights,{emissive:{value:new Ye(0)}}]),vertexShader:qe.meshtoon_vert,fragmentShader:qe.meshtoon_frag},matcap:{uniforms:At([De.common,De.bumpmap,De.normalmap,De.displacementmap,De.fog,{matcap:{value:null}}]),vertexShader:qe.meshmatcap_vert,fragmentShader:qe.meshmatcap_frag},points:{uniforms:At([De.points,De.fog]),vertexShader:qe.points_vert,fragmentShader:qe.points_frag},dashed:{uniforms:At([De.common,De.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:qe.linedashed_vert,fragmentShader:qe.linedashed_frag},depth:{uniforms:At([De.common,De.displacementmap]),vertexShader:qe.depth_vert,fragmentShader:qe.depth_frag},normal:{uniforms:At([De.common,De.bumpmap,De.normalmap,De.displacementmap,{opacity:{value:1}}]),vertexShader:qe.meshnormal_vert,fragmentShader:qe.meshnormal_frag},sprite:{uniforms:At([De.sprite,De.fog]),vertexShader:qe.sprite_vert,fragmentShader:qe.sprite_frag},background:{uniforms:{uvTransform:{value:new Ke},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:qe.background_vert,fragmentShader:qe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ke}},vertexShader:qe.backgroundCube_vert,fragmentShader:qe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:qe.cube_vert,fragmentShader:qe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:qe.equirect_vert,fragmentShader:qe.equirect_frag},distanceRGBA:{uniforms:At([De.common,De.displacementmap,{referencePosition:{value:new V},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:qe.distanceRGBA_vert,fragmentShader:qe.distanceRGBA_frag},shadow:{uniforms:At([De.lights,De.fog,{color:{value:new Ye(0)},opacity:{value:1}}]),vertexShader:qe.shadow_vert,fragmentShader:qe.shadow_frag}};rn.physical={uniforms:At([rn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ke},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ke},clearcoatNormalScale:{value:new Oe(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ke},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ke},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ke},sheen:{value:0},sheenColor:{value:new Ye(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ke},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ke},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ke},transmissionSamplerSize:{value:new Oe},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ke},attenuationDistance:{value:0},attenuationColor:{value:new Ye(0)},specularColor:{value:new Ye(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ke},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ke},anisotropyVector:{value:new Oe},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ke}}]),vertexShader:qe.meshphysical_vert,fragmentShader:qe.meshphysical_frag};const Xr={r:0,b:0,g:0},Xn=new ln,jp=new it;function qp(s,e,t,n,r,i,a){const o=new Ye(0);let l=i===!0?0:1,c,h,f=null,u=0,d=null;function g(M){let v=M.isScene===!0?M.background:null;return v&&v.isTexture&&(v=(M.backgroundBlurriness>0?t:e).get(v)),v}function _(M){let v=!1;const b=g(M);b===null?m(o,l):b&&b.isColor&&(m(b,1),v=!0);const R=s.xr.getEnvironmentBlendMode();R==="additive"?n.buffers.color.setClear(0,0,0,1,a):R==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(s.autoClear||v)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),s.clear(s.autoClearColor,s.autoClearDepth,s.autoClearStencil))}function p(M,v){const b=g(v);b&&(b.isCubeTexture||b.mapping===vs)?(h===void 0&&(h=new Rt(new ki(1,1,1),new It({name:"BackgroundCubeMaterial",uniforms:Ni(rn.backgroundCube.uniforms),vertexShader:rn.backgroundCube.vertexShader,fragmentShader:rn.backgroundCube.fragmentShader,side:Ft,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(R,w,T){this.matrixWorld.copyPosition(T.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(h)),Xn.copy(v.backgroundRotation),Xn.x*=-1,Xn.y*=-1,Xn.z*=-1,b.isCubeTexture&&b.isRenderTargetTexture===!1&&(Xn.y*=-1,Xn.z*=-1),h.material.uniforms.envMap.value=b,h.material.uniforms.flipEnvMap.value=b.isCubeTexture&&b.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=v.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,h.material.uniforms.backgroundRotation.value.setFromMatrix4(jp.makeRotationFromEuler(Xn)),h.material.toneMapped=nt.getTransfer(b.colorSpace)!==at,(f!==b||u!==b.version||d!==s.toneMapping)&&(h.material.needsUpdate=!0,f=b,u=b.version,d=s.toneMapping),h.layers.enableAll(),M.unshift(h,h.geometry,h.material,0,0,null)):b&&b.isTexture&&(c===void 0&&(c=new Rt(new ii(2,2),new It({name:"BackgroundMaterial",uniforms:Ni(rn.background.uniforms),vertexShader:rn.background.vertexShader,fragmentShader:rn.background.fragmentShader,side:Nn,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=b,c.material.uniforms.backgroundIntensity.value=v.backgroundIntensity,c.material.toneMapped=nt.getTransfer(b.colorSpace)!==at,b.matrixAutoUpdate===!0&&b.updateMatrix(),c.material.uniforms.uvTransform.value.copy(b.matrix),(f!==b||u!==b.version||d!==s.toneMapping)&&(c.material.needsUpdate=!0,f=b,u=b.version,d=s.toneMapping),c.layers.enableAll(),M.unshift(c,c.geometry,c.material,0,0,null))}function m(M,v){M.getRGB(Xr,Fc(s)),n.buffers.color.setClear(Xr.r,Xr.g,Xr.b,v,a)}return{getClearColor:function(){return o},setClearColor:function(M,v=1){o.set(M),l=v,m(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(M){l=M,m(o,l)},render:_,addToRenderList:p}}function Kp(s,e){const t=s.getParameter(s.MAX_VERTEX_ATTRIBS),n={},r=u(null);let i=r,a=!1;function o(y,L,U,I,N){let W=!1;const k=f(I,U,L);i!==k&&(i=k,c(i.object)),W=d(y,I,U,N),W&&g(y,I,U,N),N!==null&&e.update(N,s.ELEMENT_ARRAY_BUFFER),(W||a)&&(a=!1,b(y,L,U,I),N!==null&&s.bindBuffer(s.ELEMENT_ARRAY_BUFFER,e.get(N).buffer))}function l(){return s.createVertexArray()}function c(y){return s.bindVertexArray(y)}function h(y){return s.deleteVertexArray(y)}function f(y,L,U){const I=U.wireframe===!0;let N=n[y.id];N===void 0&&(N={},n[y.id]=N);let W=N[L.id];W===void 0&&(W={},N[L.id]=W);let k=W[I];return k===void 0&&(k=u(l()),W[I]=k),k}function u(y){const L=[],U=[],I=[];for(let N=0;N<t;N++)L[N]=0,U[N]=0,I[N]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:L,enabledAttributes:U,attributeDivisors:I,object:y,attributes:{},index:null}}function d(y,L,U,I){const N=i.attributes,W=L.attributes;let k=0;const se=U.getAttributes();for(const j in se)if(se[j].location>=0){const q=N[j];let F=W[j];if(F===void 0&&(j==="instanceMatrix"&&y.instanceMatrix&&(F=y.instanceMatrix),j==="instanceColor"&&y.instanceColor&&(F=y.instanceColor)),q===void 0||q.attribute!==F||F&&q.data!==F.data)return!0;k++}return i.attributesNum!==k||i.index!==I}function g(y,L,U,I){const N={},W=L.attributes;let k=0;const se=U.getAttributes();for(const j in se)if(se[j].location>=0){let q=W[j];q===void 0&&(j==="instanceMatrix"&&y.instanceMatrix&&(q=y.instanceMatrix),j==="instanceColor"&&y.instanceColor&&(q=y.instanceColor));const F={};F.attribute=q,q&&q.data&&(F.data=q.data),N[j]=F,k++}i.attributes=N,i.attributesNum=k,i.index=I}function _(){const y=i.newAttributes;for(let L=0,U=y.length;L<U;L++)y[L]=0}function p(y){m(y,0)}function m(y,L){const U=i.newAttributes,I=i.enabledAttributes,N=i.attributeDivisors;U[y]=1,I[y]===0&&(s.enableVertexAttribArray(y),I[y]=1),N[y]!==L&&(s.vertexAttribDivisor(y,L),N[y]=L)}function M(){const y=i.newAttributes,L=i.enabledAttributes;for(let U=0,I=L.length;U<I;U++)L[U]!==y[U]&&(s.disableVertexAttribArray(U),L[U]=0)}function v(y,L,U,I,N,W,k){k===!0?s.vertexAttribIPointer(y,L,U,N,W):s.vertexAttribPointer(y,L,U,I,N,W)}function b(y,L,U,I){_();const N=I.attributes,W=U.getAttributes(),k=L.defaultAttributeValues;for(const se in W){const j=W[se];if(j.location>=0){let K=N[se];if(K===void 0&&(se==="instanceMatrix"&&y.instanceMatrix&&(K=y.instanceMatrix),se==="instanceColor"&&y.instanceColor&&(K=y.instanceColor)),K!==void 0){const q=K.normalized,F=K.itemSize,H=e.get(K);if(H===void 0)continue;const ne=H.buffer,O=H.type,B=H.bytesPerElement,te=O===s.INT||O===s.UNSIGNED_INT||K.gpuType===vc;if(K.isInterleavedBufferAttribute){const G=K.data,oe=G.stride,pe=K.offset;if(G.isInstancedInterleavedBuffer){for(let ve=0;ve<j.locationSize;ve++)m(j.location+ve,G.meshPerAttribute);y.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=G.meshPerAttribute*G.count)}else for(let ve=0;ve<j.locationSize;ve++)p(j.location+ve);s.bindBuffer(s.ARRAY_BUFFER,ne);for(let ve=0;ve<j.locationSize;ve++)v(j.location+ve,F/j.locationSize,O,q,oe*B,(pe+F/j.locationSize*ve)*B,te)}else{if(K.isInstancedBufferAttribute){for(let G=0;G<j.locationSize;G++)m(j.location+G,K.meshPerAttribute);y.isInstancedMesh!==!0&&I._maxInstanceCount===void 0&&(I._maxInstanceCount=K.meshPerAttribute*K.count)}else for(let G=0;G<j.locationSize;G++)p(j.location+G);s.bindBuffer(s.ARRAY_BUFFER,ne);for(let G=0;G<j.locationSize;G++)v(j.location+G,F/j.locationSize,O,q,F*B,F/j.locationSize*G*B,te)}}else if(k!==void 0){const q=k[se];if(q!==void 0)switch(q.length){case 2:s.vertexAttrib2fv(j.location,q);break;case 3:s.vertexAttrib3fv(j.location,q);break;case 4:s.vertexAttrib4fv(j.location,q);break;default:s.vertexAttrib1fv(j.location,q)}}}}M()}function R(){P();for(const y in n){const L=n[y];for(const U in L){const I=L[U];for(const N in I)h(I[N].object),delete I[N];delete L[U]}delete n[y]}}function w(y){if(n[y.id]===void 0)return;const L=n[y.id];for(const U in L){const I=L[U];for(const N in I)h(I[N].object),delete I[N];delete L[U]}delete n[y.id]}function T(y){for(const L in n){const U=n[L];if(U[y.id]===void 0)continue;const I=U[y.id];for(const N in I)h(I[N].object),delete I[N];delete U[y.id]}}function P(){E(),a=!0,i!==r&&(i=r,c(i.object))}function E(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:P,resetDefaultState:E,dispose:R,releaseStatesOfGeometry:w,releaseStatesOfProgram:T,initAttributes:_,enableAttribute:p,disableUnusedAttributes:M}}function Zp(s,e,t){let n;function r(c){n=c}function i(c,h){s.drawArrays(n,c,h),t.update(h,n,1)}function a(c,h,f){f!==0&&(s.drawArraysInstanced(n,c,h,f),t.update(h,n,f))}function o(c,h,f){if(f===0)return;const u=e.get("WEBGL_multi_draw");if(u===null)for(let d=0;d<f;d++)this.render(c[d],h[d]);else{u.multiDrawArraysWEBGL(n,c,0,h,0,f);let d=0;for(let g=0;g<f;g++)d+=h[g];t.update(d,n,1)}}function l(c,h,f,u){if(f===0)return;const d=e.get("WEBGL_multi_draw");if(d===null)for(let g=0;g<c.length;g++)a(c[g],h[g],u[g]);else{d.multiDrawArraysInstancedWEBGL(n,c,0,h,0,u,0,f);let g=0;for(let _=0;_<f;_++)g+=h[_];for(let _=0;_<u.length;_++)t.update(g,n,u[_])}}this.setMode=r,this.render=i,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=l}function Jp(s,e,t,n){let r;function i(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const w=e.get("EXT_texture_filter_anisotropic");r=s.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(w){return!(w!==on&&n.convert(w)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(w){const T=w===Fn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(w!==On&&n.convert(w)!==s.getParameter(s.IMPLEMENTATION_COLOR_READ_TYPE)&&w!==vn&&!T)}function l(w){if(w==="highp"){if(s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.HIGH_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.HIGH_FLOAT).precision>0)return"highp";w="mediump"}return w==="mediump"&&s.getShaderPrecisionFormat(s.VERTEX_SHADER,s.MEDIUM_FLOAT).precision>0&&s.getShaderPrecisionFormat(s.FRAGMENT_SHADER,s.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const h=l(c);h!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);const f=t.logarithmicDepthBuffer===!0,u=s.getParameter(s.MAX_TEXTURE_IMAGE_UNITS),d=s.getParameter(s.MAX_VERTEX_TEXTURE_IMAGE_UNITS),g=s.getParameter(s.MAX_TEXTURE_SIZE),_=s.getParameter(s.MAX_CUBE_MAP_TEXTURE_SIZE),p=s.getParameter(s.MAX_VERTEX_ATTRIBS),m=s.getParameter(s.MAX_VERTEX_UNIFORM_VECTORS),M=s.getParameter(s.MAX_VARYING_VECTORS),v=s.getParameter(s.MAX_FRAGMENT_UNIFORM_VECTORS),b=d>0,R=s.getParameter(s.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:i,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:f,maxTextures:u,maxVertexTextures:d,maxTextureSize:g,maxCubemapSize:_,maxAttributes:p,maxVertexUniforms:m,maxVaryings:M,maxFragmentUniforms:v,vertexTextures:b,maxSamples:R}}function Qp(s){const e=this;let t=null,n=0,r=!1,i=!1;const a=new Dn,o=new Ke,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,u){const d=f.length!==0||u||n!==0||r;return r=u,n=f.length,d},this.beginShadows=function(){i=!0,h(null)},this.endShadows=function(){i=!1},this.setGlobalState=function(f,u){t=h(f,u,0)},this.setState=function(f,u,d){const g=f.clippingPlanes,_=f.clipIntersection,p=f.clipShadows,m=s.get(f);if(!r||g===null||g.length===0||i&&!p)i?h(null):c();else{const M=i?0:n,v=M*4;let b=m.clippingState||null;l.value=b,b=h(g,u,v,d);for(let R=0;R!==v;++R)b[R]=t[R];m.clippingState=b,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=M}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(f,u,d,g){const _=f!==null?f.length:0;let p=null;if(_!==0){if(p=l.value,g!==!0||p===null){const m=d+_*4,M=u.matrixWorldInverse;o.getNormalMatrix(M),(p===null||p.length<m)&&(p=new Float32Array(m));for(let v=0,b=d;v!==_;++v,b+=4)a.copy(f[v]).applyMatrix4(M,o),a.normal.toArray(p,b),p[b+3]=a.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,p}}function $p(s){let e=new WeakMap;function t(a,o){return o===ba?a.mapping=Ui:o===Ea&&(a.mapping=Di),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===ba||o===Ea)if(e.has(a)){const l=e.get(a).texture;return t(l,a.mapping)}else{const l=a.image;if(l&&l.height>0){const c=new hf(l.height);return c.fromEquirectangularTexture(s,a),e.set(a,c),a.addEventListener("dispose",r),t(c.texture,a.mapping)}else return null}}return a}function r(a){const o=a.target;o.removeEventListener("dispose",r);const l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function i(){e=new WeakMap}return{get:n,dispose:i}}class Ss extends Nc{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let i=n-e,a=n+e,o=r+t,l=r-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=c*this.view.offsetX,a=i+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}const wi=4,hl=[.125,.215,.35,.446,.526,.582],Zn=20,la=new Ss,ul=new Ye;let ca=null,ha=0,ua=0,fa=!1;const qn=(1+Math.sqrt(5))/2,Mi=1/qn,fl=[new V(-qn,Mi,0),new V(qn,Mi,0),new V(-Mi,0,qn),new V(Mi,0,qn),new V(0,qn,-Mi),new V(0,qn,Mi),new V(-1,1,-1),new V(1,1,-1),new V(-1,1,1),new V(1,1,1)];class dl{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,r=100){ca=this._renderer.getRenderTarget(),ha=this._renderer.getActiveCubeFace(),ua=this._renderer.getActiveMipmapLevel(),fa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);const i=this._allocateTargets();return i.depthBuffer=!0,this._sceneToCubeUV(e,n,r,i),t>0&&this._blur(i,0,0,t),this._applyPMREM(i),this._cleanup(i),i}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=gl(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=ml(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(ca,ha,ua),this._renderer.xr.enabled=fa,e.scissorTest=!1,Yr(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Ui||e.mapping===Di?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),ca=this._renderer.getRenderTarget(),ha=this._renderer.getActiveCubeFace(),ua=this._renderer.getActiveMipmapLevel(),fa=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:kt,minFilter:kt,generateMipmaps:!1,type:Fn,format:on,colorSpace:Bn,depthBuffer:!1},r=pl(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=pl(e,t,n);const{_lodMax:i}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=em(i)),this._blurMaterial=tm(i,e,t)}return r}_compileMaterial(e){const t=new Rt(this._lodPlanes[0],e);this._renderer.compile(t,la)}_sceneToCubeUV(e,t,n,r){const o=new Yt(90,1,t,n),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,f=h.autoClear,u=h.toneMapping;h.getClearColor(ul),h.toneMapping=In,h.autoClear=!1;const d=new pr({name:"PMREM.Background",side:Ft,depthWrite:!1,depthTest:!1}),g=new Rt(new ki,d);let _=!1;const p=e.background;p?p.isColor&&(d.color.copy(p),e.background=null,_=!0):(d.color.copy(ul),_=!0);for(let m=0;m<6;m++){const M=m%3;M===0?(o.up.set(0,l[m],0),o.lookAt(c[m],0,0)):M===1?(o.up.set(0,0,l[m]),o.lookAt(0,c[m],0)):(o.up.set(0,l[m],0),o.lookAt(0,0,c[m]));const v=this._cubeSize;Yr(r,M*v,m>2?v:0,v,v),h.setRenderTarget(r),_&&h.render(g,o),h.render(e,o)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=u,h.autoClear=f,e.background=p}_textureToCubeUV(e,t){const n=this._renderer,r=e.mapping===Ui||e.mapping===Di;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=gl()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=ml());const i=r?this._cubemapMaterial:this._equirectMaterial,a=new Rt(this._lodPlanes[0],i),o=i.uniforms;o.envMap.value=e;const l=this._cubeSize;Yr(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(a,la)}_applyPMREM(e){const t=this._renderer,n=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let i=1;i<r;i++){const a=Math.sqrt(this._sigmas[i]*this._sigmas[i]-this._sigmas[i-1]*this._sigmas[i-1]),o=fl[(r-i-1)%fl.length];this._blur(e,i-1,i,a,o)}t.autoClear=n}_blur(e,t,n,r,i){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,"latitudinal",i),this._halfBlur(a,e,n,n,r,"longitudinal",i)}_halfBlur(e,t,n,r,i,a,o){const l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,f=new Rt(this._lodPlanes[r],c),u=c.uniforms,d=this._sizeLods[n]-1,g=isFinite(i)?Math.PI/(2*d):2*Math.PI/(2*Zn-1),_=i/g,p=isFinite(i)?1+Math.floor(h*_):Zn;p>Zn&&console.warn(`sigmaRadians, ${i}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${Zn}`);const m=[];let M=0;for(let T=0;T<Zn;++T){const P=T/_,E=Math.exp(-P*P/2);m.push(E),T===0?M+=E:T<p&&(M+=2*E)}for(let T=0;T<m.length;T++)m[T]=m[T]/M;u.envMap.value=e.texture,u.samples.value=p,u.weights.value=m,u.latitudinal.value=a==="latitudinal",o&&(u.poleAxis.value=o);const{_lodMax:v}=this;u.dTheta.value=g,u.mipInt.value=v-n;const b=this._sizeLods[r],R=3*b*(r>v-wi?r-v+wi:0),w=4*(this._cubeSize-b);Yr(t,R,w,3*b,2*b),l.setRenderTarget(t),l.render(f,la)}}function em(s){const e=[],t=[],n=[];let r=s;const i=s-wi+1+hl.length;for(let a=0;a<i;a++){const o=Math.pow(2,r);t.push(o);let l=1/o;a>s-wi?l=hl[a-s+wi-1]:a===0&&(l=0),n.push(l);const c=1/(o-2),h=-c,f=1+c,u=[h,h,f,h,f,f,h,h,f,f,h,f],d=6,g=6,_=3,p=2,m=1,M=new Float32Array(_*g*d),v=new Float32Array(p*g*d),b=new Float32Array(m*g*d);for(let w=0;w<d;w++){const T=w%3*2/3-1,P=w>2?0:-1,E=[T,P,0,T+2/3,P,0,T+2/3,P+1,0,T,P,0,T+2/3,P+1,0,T,P+1,0];M.set(E,_*g*w),v.set(u,p*g*w);const y=[w,w,w,w,w,w];b.set(y,m*g*w)}const R=new zt;R.setAttribute("position",new jt(M,_)),R.setAttribute("uv",new jt(v,p)),R.setAttribute("faceIndex",new jt(b,m)),e.push(R),r>wi&&r--}return{lodPlanes:e,sizeLods:t,sigmas:n}}function pl(s,e,t){const n=new en(s,e,t);return n.texture.mapping=vs,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Yr(s,e,t,n,r){s.viewport.set(e,t,n,r),s.scissor.set(e,t,n,r)}function tm(s,e,t){const n=new Float32Array(Zn),r=new V(0,1,0);return new It({name:"SphericalGaussianBlur",defines:{n:Zn,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${s}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Va(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:yn,depthTest:!1,depthWrite:!1})}function ml(){return new It({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Va(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:yn,depthTest:!1,depthWrite:!1})}function gl(){return new It({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Va(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:yn,depthTest:!1,depthWrite:!1})}function Va(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function nm(s){let e=new WeakMap,t=null;function n(o){if(o&&o.isTexture){const l=o.mapping,c=l===ba||l===Ea,h=l===Ui||l===Di;if(c||h){let f=e.get(o);const u=f!==void 0?f.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==u)return t===null&&(t=new dl(s)),f=c?t.fromEquirectangular(o,f):t.fromCubemap(o,f),f.texture.pmremVersion=o.pmremVersion,e.set(o,f),f.texture;if(f!==void 0)return f.texture;{const d=o.image;return c&&d&&d.height>0||h&&d&&r(d)?(t===null&&(t=new dl(s)),f=c?t.fromEquirectangular(o):t.fromCubemap(o),f.texture.pmremVersion=o.pmremVersion,e.set(o,f),o.addEventListener("dispose",i),f.texture):null}}}return o}function r(o){let l=0;const c=6;for(let h=0;h<c;h++)o[h]!==void 0&&l++;return l===c}function i(o){const l=o.target;l.removeEventListener("dispose",i);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:n,dispose:a}}function im(s){const e={};function t(n){if(e[n]!==void 0)return e[n];let r;switch(n){case"WEBGL_depth_texture":r=s.getExtension("WEBGL_depth_texture")||s.getExtension("MOZ_WEBGL_depth_texture")||s.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=s.getExtension("EXT_texture_filter_anisotropic")||s.getExtension("MOZ_EXT_texture_filter_anisotropic")||s.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=s.getExtension("WEBGL_compressed_texture_s3tc")||s.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=s.getExtension("WEBGL_compressed_texture_pvrtc")||s.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=s.getExtension(n)}return e[n]=r,r}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const r=t(n);return r===null&&Rc("THREE.WebGLRenderer: "+n+" extension not supported."),r}}}function rm(s,e,t,n){const r={},i=new WeakMap;function a(f){const u=f.target;u.index!==null&&e.remove(u.index);for(const g in u.attributes)e.remove(u.attributes[g]);for(const g in u.morphAttributes){const _=u.morphAttributes[g];for(let p=0,m=_.length;p<m;p++)e.remove(_[p])}u.removeEventListener("dispose",a),delete r[u.id];const d=i.get(u);d&&(e.remove(d),i.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,t.memory.geometries--}function o(f,u){return r[u.id]===!0||(u.addEventListener("dispose",a),r[u.id]=!0,t.memory.geometries++),u}function l(f){const u=f.attributes;for(const g in u)e.update(u[g],s.ARRAY_BUFFER);const d=f.morphAttributes;for(const g in d){const _=d[g];for(let p=0,m=_.length;p<m;p++)e.update(_[p],s.ARRAY_BUFFER)}}function c(f){const u=[],d=f.index,g=f.attributes.position;let _=0;if(d!==null){const M=d.array;_=d.version;for(let v=0,b=M.length;v<b;v+=3){const R=M[v+0],w=M[v+1],T=M[v+2];u.push(R,w,w,T,T,R)}}else if(g!==void 0){const M=g.array;_=g.version;for(let v=0,b=M.length/3-1;v<b;v+=3){const R=v+0,w=v+1,T=v+2;u.push(R,w,w,T,T,R)}}else return;const p=new(Cc(u)?Ic:Lc)(u,1);p.version=_;const m=i.get(f);m&&e.remove(m),i.set(f,p)}function h(f){const u=i.get(f);if(u){const d=f.index;d!==null&&u.version<d.version&&c(f)}else c(f);return i.get(f)}return{get:o,update:l,getWireframeAttribute:h}}function sm(s,e,t){let n;function r(u){n=u}let i,a;function o(u){i=u.type,a=u.bytesPerElement}function l(u,d){s.drawElements(n,d,i,u*a),t.update(d,n,1)}function c(u,d,g){g!==0&&(s.drawElementsInstanced(n,d,i,u*a,g),t.update(d,n,g))}function h(u,d,g){if(g===0)return;const _=e.get("WEBGL_multi_draw");if(_===null)for(let p=0;p<g;p++)this.render(u[p]/a,d[p]);else{_.multiDrawElementsWEBGL(n,d,0,i,u,0,g);let p=0;for(let m=0;m<g;m++)p+=d[m];t.update(p,n,1)}}function f(u,d,g,_){if(g===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let m=0;m<u.length;m++)c(u[m]/a,d[m],_[m]);else{p.multiDrawElementsInstancedWEBGL(n,d,0,i,u,0,_,0,g);let m=0;for(let M=0;M<g;M++)m+=d[M];for(let M=0;M<_.length;M++)t.update(m,n,_[M])}}this.setMode=r,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=h,this.renderMultiDrawInstances=f}function am(s){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(i,a,o){switch(t.calls++,a){case s.TRIANGLES:t.triangles+=o*(i/3);break;case s.LINES:t.lines+=o*(i/2);break;case s.LINE_STRIP:t.lines+=o*(i-1);break;case s.LINE_LOOP:t.lines+=o*i;break;case s.POINTS:t.points+=o*i;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:n}}function om(s,e,t){const n=new WeakMap,r=new ht;function i(a,o,l){const c=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,f=h!==void 0?h.length:0;let u=n.get(o);if(u===void 0||u.count!==f){let E=function(){T.dispose(),n.delete(o),o.removeEventListener("dispose",E)};u!==void 0&&u.texture.dispose();const d=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,_=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],m=o.morphAttributes.normal||[],M=o.morphAttributes.color||[];let v=0;d===!0&&(v=1),g===!0&&(v=2),_===!0&&(v=3);let b=o.attributes.position.count*v,R=1;b>e.maxTextureSize&&(R=Math.ceil(b/e.maxTextureSize),b=e.maxTextureSize);const w=new Float32Array(b*R*4*f),T=new Uc(w,b,R,f);T.type=vn,T.needsUpdate=!0;const P=v*4;for(let y=0;y<f;y++){const L=p[y],U=m[y],I=M[y],N=b*R*4*y;for(let W=0;W<L.count;W++){const k=W*P;d===!0&&(r.fromBufferAttribute(L,W),w[N+k+0]=r.x,w[N+k+1]=r.y,w[N+k+2]=r.z,w[N+k+3]=0),g===!0&&(r.fromBufferAttribute(U,W),w[N+k+4]=r.x,w[N+k+5]=r.y,w[N+k+6]=r.z,w[N+k+7]=0),_===!0&&(r.fromBufferAttribute(I,W),w[N+k+8]=r.x,w[N+k+9]=r.y,w[N+k+10]=r.z,w[N+k+11]=I.itemSize===4?r.w:1)}}u={count:f,texture:T,size:new Oe(b,R)},n.set(o,u),o.addEventListener("dispose",E)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(s,"morphTexture",a.morphTexture,t);else{let d=0;for(let _=0;_<c.length;_++)d+=c[_];const g=o.morphTargetsRelative?1:1-d;l.getUniforms().setValue(s,"morphTargetBaseInfluence",g),l.getUniforms().setValue(s,"morphTargetInfluences",c)}l.getUniforms().setValue(s,"morphTargetsTexture",u.texture,t),l.getUniforms().setValue(s,"morphTargetsTextureSize",u.size)}return{update:i}}function lm(s,e,t,n){let r=new WeakMap;function i(l){const c=n.render.frame,h=l.geometry,f=e.get(l,h);if(r.get(f)!==c&&(e.update(f),r.set(f,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),r.get(l)!==c&&(t.update(l.instanceMatrix,s.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,s.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const u=l.skeleton;r.get(u)!==c&&(u.update(),r.set(u,c))}return f}function a(){r=new WeakMap}function o(l){const c=l.target;c.removeEventListener("dispose",o),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:i,dispose:a}}class kc extends Tt{constructor(e,t,n,r,i,a,o,l,c,h=Ci){if(h!==Ci&&h!==Fi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===Ci&&(n=Li),n===void 0&&h===Fi&&(n=Ii),super(null,r,i,a,o,l,h,n,c),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o!==void 0?o:Lt,this.minFilter=l!==void 0?l:Lt,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}const zc=new Tt,Gc=new kc(1,1);Gc.compareFunction=Ac;const Hc=new Uc,Vc=new qu,Wc=new Oc,_l=[],vl=[],xl=new Float32Array(16),yl=new Float32Array(9),Sl=new Float32Array(4);function zi(s,e,t){const n=s[0];if(n<=0||n>0)return s;const r=e*t;let i=_l[r];if(i===void 0&&(i=new Float32Array(r),_l[r]=i),e!==0){n.toArray(i,0);for(let a=1,o=0;a!==e;++a)o+=t,s[a].toArray(i,o)}return i}function ut(s,e){if(s.length!==e.length)return!1;for(let t=0,n=s.length;t<n;t++)if(s[t]!==e[t])return!1;return!0}function ft(s,e){for(let t=0,n=e.length;t<n;t++)s[t]=e[t]}function Ms(s,e){let t=vl[e];t===void 0&&(t=new Int32Array(e),vl[e]=t);for(let n=0;n!==e;++n)t[n]=s.allocateTextureUnit();return t}function cm(s,e){const t=this.cache;t[0]!==e&&(s.uniform1f(this.addr,e),t[0]=e)}function hm(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ut(t,e))return;s.uniform2fv(this.addr,e),ft(t,e)}}function um(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(s.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(ut(t,e))return;s.uniform3fv(this.addr,e),ft(t,e)}}function fm(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ut(t,e))return;s.uniform4fv(this.addr,e),ft(t,e)}}function dm(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(ut(t,e))return;s.uniformMatrix2fv(this.addr,!1,e),ft(t,e)}else{if(ut(t,n))return;Sl.set(n),s.uniformMatrix2fv(this.addr,!1,Sl),ft(t,n)}}function pm(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(ut(t,e))return;s.uniformMatrix3fv(this.addr,!1,e),ft(t,e)}else{if(ut(t,n))return;yl.set(n),s.uniformMatrix3fv(this.addr,!1,yl),ft(t,n)}}function mm(s,e){const t=this.cache,n=e.elements;if(n===void 0){if(ut(t,e))return;s.uniformMatrix4fv(this.addr,!1,e),ft(t,e)}else{if(ut(t,n))return;xl.set(n),s.uniformMatrix4fv(this.addr,!1,xl),ft(t,n)}}function gm(s,e){const t=this.cache;t[0]!==e&&(s.uniform1i(this.addr,e),t[0]=e)}function _m(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ut(t,e))return;s.uniform2iv(this.addr,e),ft(t,e)}}function vm(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(ut(t,e))return;s.uniform3iv(this.addr,e),ft(t,e)}}function xm(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ut(t,e))return;s.uniform4iv(this.addr,e),ft(t,e)}}function ym(s,e){const t=this.cache;t[0]!==e&&(s.uniform1ui(this.addr,e),t[0]=e)}function Sm(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(s.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ut(t,e))return;s.uniform2uiv(this.addr,e),ft(t,e)}}function Mm(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(s.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(ut(t,e))return;s.uniform3uiv(this.addr,e),ft(t,e)}}function bm(s,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(s.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ut(t,e))return;s.uniform4uiv(this.addr,e),ft(t,e)}}function Em(s,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(s.uniform1i(this.addr,r),n[0]=r);const i=this.type===s.SAMPLER_2D_SHADOW?Gc:zc;t.setTexture2D(e||i,r)}function Tm(s,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(s.uniform1i(this.addr,r),n[0]=r),t.setTexture3D(e||Vc,r)}function wm(s,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(s.uniform1i(this.addr,r),n[0]=r),t.setTextureCube(e||Wc,r)}function Am(s,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(s.uniform1i(this.addr,r),n[0]=r),t.setTexture2DArray(e||Hc,r)}function Cm(s){switch(s){case 5126:return cm;case 35664:return hm;case 35665:return um;case 35666:return fm;case 35674:return dm;case 35675:return pm;case 35676:return mm;case 5124:case 35670:return gm;case 35667:case 35671:return _m;case 35668:case 35672:return vm;case 35669:case 35673:return xm;case 5125:return ym;case 36294:return Sm;case 36295:return Mm;case 36296:return bm;case 35678:case 36198:case 36298:case 36306:case 35682:return Em;case 35679:case 36299:case 36307:return Tm;case 35680:case 36300:case 36308:case 36293:return wm;case 36289:case 36303:case 36311:case 36292:return Am}}function Rm(s,e){s.uniform1fv(this.addr,e)}function Pm(s,e){const t=zi(e,this.size,2);s.uniform2fv(this.addr,t)}function Um(s,e){const t=zi(e,this.size,3);s.uniform3fv(this.addr,t)}function Dm(s,e){const t=zi(e,this.size,4);s.uniform4fv(this.addr,t)}function Lm(s,e){const t=zi(e,this.size,4);s.uniformMatrix2fv(this.addr,!1,t)}function Im(s,e){const t=zi(e,this.size,9);s.uniformMatrix3fv(this.addr,!1,t)}function Fm(s,e){const t=zi(e,this.size,16);s.uniformMatrix4fv(this.addr,!1,t)}function Nm(s,e){s.uniform1iv(this.addr,e)}function Om(s,e){s.uniform2iv(this.addr,e)}function Bm(s,e){s.uniform3iv(this.addr,e)}function km(s,e){s.uniform4iv(this.addr,e)}function zm(s,e){s.uniform1uiv(this.addr,e)}function Gm(s,e){s.uniform2uiv(this.addr,e)}function Hm(s,e){s.uniform3uiv(this.addr,e)}function Vm(s,e){s.uniform4uiv(this.addr,e)}function Wm(s,e,t){const n=this.cache,r=e.length,i=Ms(t,r);ut(n,i)||(s.uniform1iv(this.addr,i),ft(n,i));for(let a=0;a!==r;++a)t.setTexture2D(e[a]||zc,i[a])}function Xm(s,e,t){const n=this.cache,r=e.length,i=Ms(t,r);ut(n,i)||(s.uniform1iv(this.addr,i),ft(n,i));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||Vc,i[a])}function Ym(s,e,t){const n=this.cache,r=e.length,i=Ms(t,r);ut(n,i)||(s.uniform1iv(this.addr,i),ft(n,i));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||Wc,i[a])}function jm(s,e,t){const n=this.cache,r=e.length,i=Ms(t,r);ut(n,i)||(s.uniform1iv(this.addr,i),ft(n,i));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||Hc,i[a])}function qm(s){switch(s){case 5126:return Rm;case 35664:return Pm;case 35665:return Um;case 35666:return Dm;case 35674:return Lm;case 35675:return Im;case 35676:return Fm;case 5124:case 35670:return Nm;case 35667:case 35671:return Om;case 35668:case 35672:return Bm;case 35669:case 35673:return km;case 5125:return zm;case 36294:return Gm;case 36295:return Hm;case 36296:return Vm;case 35678:case 36198:case 36298:case 36306:case 35682:return Wm;case 35679:case 36299:case 36307:return Xm;case 35680:case 36300:case 36308:case 36293:return Ym;case 36289:case 36303:case 36311:case 36292:return jm}}class Km{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Cm(t.type)}}class Zm{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=qm(t.type)}}class Jm{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const r=this.seq;for(let i=0,a=r.length;i!==a;++i){const o=r[i];o.setValue(e,t[o.id],n)}}}const da=/(\w+)(\])?(\[|\.)?/g;function Ml(s,e){s.seq.push(e),s.map[e.id]=e}function Qm(s,e,t){const n=s.name,r=n.length;for(da.lastIndex=0;;){const i=da.exec(n),a=da.lastIndex;let o=i[1];const l=i[2]==="]",c=i[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===r){Ml(t,c===void 0?new Km(o,s,e):new Zm(o,s,e));break}else{let f=t.map[o];f===void 0&&(f=new Jm(o),Ml(t,f)),t=f}}}class rs{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){const i=e.getActiveUniform(t,r),a=e.getUniformLocation(t,i.name);Qm(i,a,this)}}setValue(e,t,n,r){const i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){const r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){const o=t[i],l=n[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,r)}}static seqWithValue(e,t){const n=[];for(let r=0,i=e.length;r!==i;++r){const a=e[r];a.id in t&&n.push(a)}return n}}function bl(s,e,t){const n=s.createShader(e);return s.shaderSource(n,t),s.compileShader(n),n}const $m=37297;let eg=0;function tg(s,e){const t=s.split(`
`),n=[],r=Math.max(e-6,0),i=Math.min(e+6,t.length);for(let a=r;a<i;a++){const o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}function ng(s){const e=nt.getPrimaries(nt.workingColorSpace),t=nt.getPrimaries(s);let n;switch(e===t?n="":e===ds&&t===fs?n="LinearDisplayP3ToLinearSRGB":e===fs&&t===ds&&(n="LinearSRGBToLinearDisplayP3"),s){case Bn:case xs:return[n,"LinearTransferOETF"];case nn:case za:return[n,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",s),[n,"LinearTransferOETF"]}}function El(s,e,t){const n=s.getShaderParameter(e,s.COMPILE_STATUS),r=s.getShaderInfoLog(e).trim();if(n&&r==="")return"";const i=/ERROR: 0:(\d+)/.exec(r);if(i){const a=parseInt(i[1]);return t.toUpperCase()+`

`+r+`

`+tg(s.getShaderSource(e),a)}else return r}function ig(s,e){const t=ng(e);return`vec4 ${s}( vec4 value ) { return ${t[0]}( ${t[1]}( value ) ); }`}function rg(s,e){let t;switch(e){case du:t="Linear";break;case pu:t="Reinhard";break;case mu:t="OptimizedCineon";break;case gu:t="ACESFilmic";break;case vu:t="AgX";break;case xu:t="Neutral";break;case _u:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+s+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function sg(s){return[s.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",s.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(or).join(`
`)}function ag(s){const e=[];for(const t in s){const n=s[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function og(s,e){const t={},n=s.getProgramParameter(e,s.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){const i=s.getActiveAttrib(e,r),a=i.name;let o=1;i.type===s.FLOAT_MAT2&&(o=2),i.type===s.FLOAT_MAT3&&(o=3),i.type===s.FLOAT_MAT4&&(o=4),t[a]={type:i.type,location:s.getAttribLocation(e,a),locationSize:o}}return t}function or(s){return s!==""}function Tl(s,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return s.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function wl(s,e){return s.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const lg=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ca(s){return s.replace(lg,hg)}const cg=new Map;function hg(s,e){let t=qe[e];if(t===void 0){const n=cg.get(e);if(n!==void 0)t=qe[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("Can not resolve #include <"+e+">")}return Ca(t)}const ug=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Al(s){return s.replace(ug,fg)}function fg(s,e,t,n){let r="";for(let i=parseInt(e);i<parseInt(t);i++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+i+" ]").replace(/UNROLLED_LOOP_INDEX/g,i);return r}function Cl(s){let e=`precision ${s.precision} float;
	precision ${s.precision} int;
	precision ${s.precision} sampler2D;
	precision ${s.precision} samplerCube;
	precision ${s.precision} sampler3D;
	precision ${s.precision} sampler2DArray;
	precision ${s.precision} sampler2DShadow;
	precision ${s.precision} samplerCubeShadow;
	precision ${s.precision} sampler2DArrayShadow;
	precision ${s.precision} isampler2D;
	precision ${s.precision} isampler3D;
	precision ${s.precision} isamplerCube;
	precision ${s.precision} isampler2DArray;
	precision ${s.precision} usampler2D;
	precision ${s.precision} usampler3D;
	precision ${s.precision} usamplerCube;
	precision ${s.precision} usampler2DArray;
	`;return s.precision==="highp"?e+=`
#define HIGH_PRECISION`:s.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:s.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function dg(s){let e="SHADOWMAP_TYPE_BASIC";return s.shadowMapType===mc?e="SHADOWMAP_TYPE_PCF":s.shadowMapType===kh?e="SHADOWMAP_TYPE_PCF_SOFT":s.shadowMapType===gn&&(e="SHADOWMAP_TYPE_VSM"),e}function pg(s){let e="ENVMAP_TYPE_CUBE";if(s.envMap)switch(s.envMapMode){case Ui:case Di:e="ENVMAP_TYPE_CUBE";break;case vs:e="ENVMAP_TYPE_CUBE_UV";break}return e}function mg(s){let e="ENVMAP_MODE_REFLECTION";if(s.envMap)switch(s.envMapMode){case Di:e="ENVMAP_MODE_REFRACTION";break}return e}function gg(s){let e="ENVMAP_BLENDING_NONE";if(s.envMap)switch(s.combine){case gc:e="ENVMAP_BLENDING_MULTIPLY";break;case uu:e="ENVMAP_BLENDING_MIX";break;case fu:e="ENVMAP_BLENDING_ADD";break}return e}function _g(s){const e=s.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}function vg(s,e,t,n){const r=s.getContext(),i=t.defines;let a=t.vertexShader,o=t.fragmentShader;const l=dg(t),c=pg(t),h=mg(t),f=gg(t),u=_g(t),d=sg(t),g=ag(i),_=r.createProgram();let p,m,M=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(or).join(`
`),p.length>0&&(p+=`
`),m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(or).join(`
`),m.length>0&&(m+=`
`)):(p=[Cl(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(or).join(`
`),m=[Cl(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+f:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==In?"#define TONE_MAPPING":"",t.toneMapping!==In?qe.tonemapping_pars_fragment:"",t.toneMapping!==In?rg("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",qe.colorspace_pars_fragment,ig("linearToOutputTexel",t.outputColorSpace),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(or).join(`
`)),a=Ca(a),a=Tl(a,t),a=wl(a,t),o=Ca(o),o=Tl(o,t),o=wl(o,t),a=Al(a),o=Al(o),t.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,p=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,m=["#define varying in",t.glslVersion===Wo?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Wo?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+m);const v=M+p+a,b=M+m+o,R=bl(r,r.VERTEX_SHADER,v),w=bl(r,r.FRAGMENT_SHADER,b);r.attachShader(_,R),r.attachShader(_,w),t.index0AttributeName!==void 0?r.bindAttribLocation(_,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(_,0,"position"),r.linkProgram(_);function T(L){if(s.debug.checkShaderErrors){const U=r.getProgramInfoLog(_).trim(),I=r.getShaderInfoLog(R).trim(),N=r.getShaderInfoLog(w).trim();let W=!0,k=!0;if(r.getProgramParameter(_,r.LINK_STATUS)===!1)if(W=!1,typeof s.debug.onShaderError=="function")s.debug.onShaderError(r,_,R,w);else{const se=El(r,R,"vertex"),j=El(r,w,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(_,r.VALIDATE_STATUS)+`

Material Name: `+L.name+`
Material Type: `+L.type+`

Program Info Log: `+U+`
`+se+`
`+j)}else U!==""?console.warn("THREE.WebGLProgram: Program Info Log:",U):(I===""||N==="")&&(k=!1);k&&(L.diagnostics={runnable:W,programLog:U,vertexShader:{log:I,prefix:p},fragmentShader:{log:N,prefix:m}})}r.deleteShader(R),r.deleteShader(w),P=new rs(r,_),E=og(r,_)}let P;this.getUniforms=function(){return P===void 0&&T(this),P};let E;this.getAttributes=function(){return E===void 0&&T(this),E};let y=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return y===!1&&(y=r.getProgramParameter(_,$m)),y},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=eg++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=R,this.fragmentShader=w,this}let xg=0;class yg{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,n=e.fragmentShader,r=this._getShaderStage(t),i=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(i)===!1&&(a.add(i),i.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new Sg(e),t.set(e,n)),n}}class Sg{constructor(e){this.id=xg++,this.code=e,this.usedTimes=0}}function Mg(s,e,t,n,r,i,a){const o=new Ga,l=new yg,c=new Set,h=[],f=r.logarithmicDepthBuffer,u=r.vertexTextures;let d=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(E){return c.add(E),E===0?"uv":`uv${E}`}function p(E,y,L,U,I){const N=U.fog,W=I.geometry,k=E.isMeshStandardMaterial?U.environment:null,se=(E.isMeshStandardMaterial?t:e).get(E.envMap||k),j=se&&se.mapping===vs?se.image.height:null,K=g[E.type];E.precision!==null&&(d=r.getMaxPrecision(E.precision),d!==E.precision&&console.warn("THREE.WebGLProgram.getParameters:",E.precision,"not supported, using",d,"instead."));const q=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,F=q!==void 0?q.length:0;let H=0;W.morphAttributes.position!==void 0&&(H=1),W.morphAttributes.normal!==void 0&&(H=2),W.morphAttributes.color!==void 0&&(H=3);let ne,O,B,te;if(K){const Le=rn[K];ne=Le.vertexShader,O=Le.fragmentShader}else ne=E.vertexShader,O=E.fragmentShader,l.update(E),B=l.getVertexShaderID(E),te=l.getFragmentShaderID(E);const G=s.getRenderTarget(),oe=I.isInstancedMesh===!0,pe=I.isBatchedMesh===!0,ve=!!E.map,D=!!E.matcap,he=!!se,Pe=!!E.aoMap,Ue=!!E.lightMap,de=!!E.bumpMap,ye=!!E.normalMap,Me=!!E.displacementMap,fe=!!E.emissiveMap,Ce=!!E.metalnessMap,C=!!E.roughnessMap,x=E.anisotropy>0,X=E.clearcoat>0,Z=E.dispersion>0,ie=E.iridescence>0,Q=E.sheen>0,Te=E.transmission>0,le=x&&!!E.anisotropyMap,ce=X&&!!E.clearcoatMap,Se=X&&!!E.clearcoatNormalMap,ue=X&&!!E.clearcoatRoughnessMap,be=ie&&!!E.iridescenceMap,Be=ie&&!!E.iridescenceThicknessMap,we=Q&&!!E.sheenColorMap,me=Q&&!!E.sheenRoughnessMap,xe=!!E.specularMap,Ne=!!E.specularColorMap,Ve=!!E.specularIntensityMap,S=Te&&!!E.transmissionMap,$=Te&&!!E.thicknessMap,z=!!E.gradientMap,ee=!!E.alphaMap,ge=E.alphaTest>0,Ae=!!E.alphaHash,Re=!!E.extensions;let je=In;E.toneMapped&&(G===null||G.isXRRenderTarget===!0)&&(je=s.toneMapping);const We={shaderID:K,shaderType:E.type,shaderName:E.name,vertexShader:ne,fragmentShader:O,defines:E.defines,customVertexShaderID:B,customFragmentShaderID:te,isRawShaderMaterial:E.isRawShaderMaterial===!0,glslVersion:E.glslVersion,precision:d,batching:pe,batchingColor:pe&&I._colorsTexture!==null,instancing:oe,instancingColor:oe&&I.instanceColor!==null,instancingMorph:oe&&I.morphTexture!==null,supportsVertexTextures:u,outputColorSpace:G===null?s.outputColorSpace:G.isXRRenderTarget===!0?G.texture.colorSpace:Bn,alphaToCoverage:!!E.alphaToCoverage,map:ve,matcap:D,envMap:he,envMapMode:he&&se.mapping,envMapCubeUVHeight:j,aoMap:Pe,lightMap:Ue,bumpMap:de,normalMap:ye,displacementMap:u&&Me,emissiveMap:fe,normalMapObjectSpace:ye&&E.normalMapType===Uu,normalMapTangentSpace:ye&&E.normalMapType===wc,metalnessMap:Ce,roughnessMap:C,anisotropy:x,anisotropyMap:le,clearcoat:X,clearcoatMap:ce,clearcoatNormalMap:Se,clearcoatRoughnessMap:ue,dispersion:Z,iridescence:ie,iridescenceMap:be,iridescenceThicknessMap:Be,sheen:Q,sheenColorMap:we,sheenRoughnessMap:me,specularMap:xe,specularColorMap:Ne,specularIntensityMap:Ve,transmission:Te,transmissionMap:S,thicknessMap:$,gradientMap:z,opaque:E.transparent===!1&&E.blending===Ai&&E.alphaToCoverage===!1,alphaMap:ee,alphaTest:ge,alphaHash:Ae,combine:E.combine,mapUv:ve&&_(E.map.channel),aoMapUv:Pe&&_(E.aoMap.channel),lightMapUv:Ue&&_(E.lightMap.channel),bumpMapUv:de&&_(E.bumpMap.channel),normalMapUv:ye&&_(E.normalMap.channel),displacementMapUv:Me&&_(E.displacementMap.channel),emissiveMapUv:fe&&_(E.emissiveMap.channel),metalnessMapUv:Ce&&_(E.metalnessMap.channel),roughnessMapUv:C&&_(E.roughnessMap.channel),anisotropyMapUv:le&&_(E.anisotropyMap.channel),clearcoatMapUv:ce&&_(E.clearcoatMap.channel),clearcoatNormalMapUv:Se&&_(E.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ue&&_(E.clearcoatRoughnessMap.channel),iridescenceMapUv:be&&_(E.iridescenceMap.channel),iridescenceThicknessMapUv:Be&&_(E.iridescenceThicknessMap.channel),sheenColorMapUv:we&&_(E.sheenColorMap.channel),sheenRoughnessMapUv:me&&_(E.sheenRoughnessMap.channel),specularMapUv:xe&&_(E.specularMap.channel),specularColorMapUv:Ne&&_(E.specularColorMap.channel),specularIntensityMapUv:Ve&&_(E.specularIntensityMap.channel),transmissionMapUv:S&&_(E.transmissionMap.channel),thicknessMapUv:$&&_(E.thicknessMap.channel),alphaMapUv:ee&&_(E.alphaMap.channel),vertexTangents:!!W.attributes.tangent&&(ye||x),vertexColors:E.vertexColors,vertexAlphas:E.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,pointsUvs:I.isPoints===!0&&!!W.attributes.uv&&(ve||ee),fog:!!N,useFog:E.fog===!0,fogExp2:!!N&&N.isFogExp2,flatShading:E.flatShading===!0,sizeAttenuation:E.sizeAttenuation===!0,logarithmicDepthBuffer:f,skinning:I.isSkinnedMesh===!0,morphTargets:W.morphAttributes.position!==void 0,morphNormals:W.morphAttributes.normal!==void 0,morphColors:W.morphAttributes.color!==void 0,morphTargetsCount:F,morphTextureStride:H,numDirLights:y.directional.length,numPointLights:y.point.length,numSpotLights:y.spot.length,numSpotLightMaps:y.spotLightMap.length,numRectAreaLights:y.rectArea.length,numHemiLights:y.hemi.length,numDirLightShadows:y.directionalShadowMap.length,numPointLightShadows:y.pointShadowMap.length,numSpotLightShadows:y.spotShadowMap.length,numSpotLightShadowsWithMaps:y.numSpotLightShadowsWithMaps,numLightProbes:y.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:E.dithering,shadowMapEnabled:s.shadowMap.enabled&&L.length>0,shadowMapType:s.shadowMap.type,toneMapping:je,decodeVideoTexture:ve&&E.map.isVideoTexture===!0&&nt.getTransfer(E.map.colorSpace)===at,premultipliedAlpha:E.premultipliedAlpha,doubleSided:E.side===sn,flipSided:E.side===Ft,useDepthPacking:E.depthPacking>=0,depthPacking:E.depthPacking||0,index0AttributeName:E.index0AttributeName,extensionClipCullDistance:Re&&E.extensions.clipCullDistance===!0&&n.has("WEBGL_clip_cull_distance"),extensionMultiDraw:Re&&E.extensions.multiDraw===!0&&n.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:E.customProgramCacheKey()};return We.vertexUv1s=c.has(1),We.vertexUv2s=c.has(2),We.vertexUv3s=c.has(3),c.clear(),We}function m(E){const y=[];if(E.shaderID?y.push(E.shaderID):(y.push(E.customVertexShaderID),y.push(E.customFragmentShaderID)),E.defines!==void 0)for(const L in E.defines)y.push(L),y.push(E.defines[L]);return E.isRawShaderMaterial===!1&&(M(y,E),v(y,E),y.push(s.outputColorSpace)),y.push(E.customProgramCacheKey),y.join()}function M(E,y){E.push(y.precision),E.push(y.outputColorSpace),E.push(y.envMapMode),E.push(y.envMapCubeUVHeight),E.push(y.mapUv),E.push(y.alphaMapUv),E.push(y.lightMapUv),E.push(y.aoMapUv),E.push(y.bumpMapUv),E.push(y.normalMapUv),E.push(y.displacementMapUv),E.push(y.emissiveMapUv),E.push(y.metalnessMapUv),E.push(y.roughnessMapUv),E.push(y.anisotropyMapUv),E.push(y.clearcoatMapUv),E.push(y.clearcoatNormalMapUv),E.push(y.clearcoatRoughnessMapUv),E.push(y.iridescenceMapUv),E.push(y.iridescenceThicknessMapUv),E.push(y.sheenColorMapUv),E.push(y.sheenRoughnessMapUv),E.push(y.specularMapUv),E.push(y.specularColorMapUv),E.push(y.specularIntensityMapUv),E.push(y.transmissionMapUv),E.push(y.thicknessMapUv),E.push(y.combine),E.push(y.fogExp2),E.push(y.sizeAttenuation),E.push(y.morphTargetsCount),E.push(y.morphAttributeCount),E.push(y.numDirLights),E.push(y.numPointLights),E.push(y.numSpotLights),E.push(y.numSpotLightMaps),E.push(y.numHemiLights),E.push(y.numRectAreaLights),E.push(y.numDirLightShadows),E.push(y.numPointLightShadows),E.push(y.numSpotLightShadows),E.push(y.numSpotLightShadowsWithMaps),E.push(y.numLightProbes),E.push(y.shadowMapType),E.push(y.toneMapping),E.push(y.numClippingPlanes),E.push(y.numClipIntersection),E.push(y.depthPacking)}function v(E,y){o.disableAll(),y.supportsVertexTextures&&o.enable(0),y.instancing&&o.enable(1),y.instancingColor&&o.enable(2),y.instancingMorph&&o.enable(3),y.matcap&&o.enable(4),y.envMap&&o.enable(5),y.normalMapObjectSpace&&o.enable(6),y.normalMapTangentSpace&&o.enable(7),y.clearcoat&&o.enable(8),y.iridescence&&o.enable(9),y.alphaTest&&o.enable(10),y.vertexColors&&o.enable(11),y.vertexAlphas&&o.enable(12),y.vertexUv1s&&o.enable(13),y.vertexUv2s&&o.enable(14),y.vertexUv3s&&o.enable(15),y.vertexTangents&&o.enable(16),y.anisotropy&&o.enable(17),y.alphaHash&&o.enable(18),y.batching&&o.enable(19),y.dispersion&&o.enable(20),y.batchingColor&&o.enable(21),E.push(o.mask),o.disableAll(),y.fog&&o.enable(0),y.useFog&&o.enable(1),y.flatShading&&o.enable(2),y.logarithmicDepthBuffer&&o.enable(3),y.skinning&&o.enable(4),y.morphTargets&&o.enable(5),y.morphNormals&&o.enable(6),y.morphColors&&o.enable(7),y.premultipliedAlpha&&o.enable(8),y.shadowMapEnabled&&o.enable(9),y.doubleSided&&o.enable(10),y.flipSided&&o.enable(11),y.useDepthPacking&&o.enable(12),y.dithering&&o.enable(13),y.transmission&&o.enable(14),y.sheen&&o.enable(15),y.opaque&&o.enable(16),y.pointsUvs&&o.enable(17),y.decodeVideoTexture&&o.enable(18),y.alphaToCoverage&&o.enable(19),E.push(o.mask)}function b(E){const y=g[E.type];let L;if(y){const U=rn[y];L=fr.clone(U.uniforms)}else L=E.uniforms;return L}function R(E,y){let L;for(let U=0,I=h.length;U<I;U++){const N=h[U];if(N.cacheKey===y){L=N,++L.usedTimes;break}}return L===void 0&&(L=new vg(s,y,E,i),h.push(L)),L}function w(E){if(--E.usedTimes===0){const y=h.indexOf(E);h[y]=h[h.length-1],h.pop(),E.destroy()}}function T(E){l.remove(E)}function P(){l.dispose()}return{getParameters:p,getProgramCacheKey:m,getUniforms:b,acquireProgram:R,releaseProgram:w,releaseShaderCache:T,programs:h,dispose:P}}function bg(){let s=new WeakMap;function e(i){let a=s.get(i);return a===void 0&&(a={},s.set(i,a)),a}function t(i){s.delete(i)}function n(i,a,o){s.get(i)[a]=o}function r(){s=new WeakMap}return{get:e,remove:t,update:n,dispose:r}}function Eg(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.material.id!==e.material.id?s.material.id-e.material.id:s.z!==e.z?s.z-e.z:s.id-e.id}function Rl(s,e){return s.groupOrder!==e.groupOrder?s.groupOrder-e.groupOrder:s.renderOrder!==e.renderOrder?s.renderOrder-e.renderOrder:s.z!==e.z?e.z-s.z:s.id-e.id}function Pl(){const s=[];let e=0;const t=[],n=[],r=[];function i(){e=0,t.length=0,n.length=0,r.length=0}function a(f,u,d,g,_,p){let m=s[e];return m===void 0?(m={id:f.id,object:f,geometry:u,material:d,groupOrder:g,renderOrder:f.renderOrder,z:_,group:p},s[e]=m):(m.id=f.id,m.object=f,m.geometry=u,m.material=d,m.groupOrder=g,m.renderOrder=f.renderOrder,m.z=_,m.group=p),e++,m}function o(f,u,d,g,_,p){const m=a(f,u,d,g,_,p);d.transmission>0?n.push(m):d.transparent===!0?r.push(m):t.push(m)}function l(f,u,d,g,_,p){const m=a(f,u,d,g,_,p);d.transmission>0?n.unshift(m):d.transparent===!0?r.unshift(m):t.unshift(m)}function c(f,u){t.length>1&&t.sort(f||Eg),n.length>1&&n.sort(u||Rl),r.length>1&&r.sort(u||Rl)}function h(){for(let f=e,u=s.length;f<u;f++){const d=s[f];if(d.id===null)break;d.id=null,d.object=null,d.geometry=null,d.material=null,d.group=null}}return{opaque:t,transmissive:n,transparent:r,init:i,push:o,unshift:l,finish:h,sort:c}}function Tg(){let s=new WeakMap;function e(n,r){const i=s.get(n);let a;return i===void 0?(a=new Pl,s.set(n,[a])):r>=i.length?(a=new Pl,i.push(a)):a=i[r],a}function t(){s=new WeakMap}return{get:e,dispose:t}}function wg(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new V,color:new Ye};break;case"SpotLight":t={position:new V,direction:new V,color:new Ye,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new V,color:new Ye,distance:0,decay:0};break;case"HemisphereLight":t={direction:new V,skyColor:new Ye,groundColor:new Ye};break;case"RectAreaLight":t={color:new Ye,position:new V,halfWidth:new V,halfHeight:new V};break}return s[e.id]=t,t}}}function Ag(){const s={};return{get:function(e){if(s[e.id]!==void 0)return s[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Oe};break;case"SpotLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Oe};break;case"PointLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Oe,shadowCameraNear:1,shadowCameraFar:1e3};break}return s[e.id]=t,t}}}let Cg=0;function Rg(s,e){return(e.castShadow?2:0)-(s.castShadow?2:0)+(e.map?1:0)-(s.map?1:0)}function Pg(s){const e=new wg,t=Ag(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new V);const r=new V,i=new it,a=new it;function o(c){let h=0,f=0,u=0;for(let E=0;E<9;E++)n.probe[E].set(0,0,0);let d=0,g=0,_=0,p=0,m=0,M=0,v=0,b=0,R=0,w=0,T=0;c.sort(Rg);for(let E=0,y=c.length;E<y;E++){const L=c[E],U=L.color,I=L.intensity,N=L.distance,W=L.shadow&&L.shadow.map?L.shadow.map.texture:null;if(L.isAmbientLight)h+=U.r*I,f+=U.g*I,u+=U.b*I;else if(L.isLightProbe){for(let k=0;k<9;k++)n.probe[k].addScaledVector(L.sh.coefficients[k],I);T++}else if(L.isDirectionalLight){const k=e.get(L);if(k.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const se=L.shadow,j=t.get(L);j.shadowBias=se.bias,j.shadowNormalBias=se.normalBias,j.shadowRadius=se.radius,j.shadowMapSize=se.mapSize,n.directionalShadow[d]=j,n.directionalShadowMap[d]=W,n.directionalShadowMatrix[d]=L.shadow.matrix,M++}n.directional[d]=k,d++}else if(L.isSpotLight){const k=e.get(L);k.position.setFromMatrixPosition(L.matrixWorld),k.color.copy(U).multiplyScalar(I),k.distance=N,k.coneCos=Math.cos(L.angle),k.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),k.decay=L.decay,n.spot[_]=k;const se=L.shadow;if(L.map&&(n.spotLightMap[R]=L.map,R++,se.updateMatrices(L),L.castShadow&&w++),n.spotLightMatrix[_]=se.matrix,L.castShadow){const j=t.get(L);j.shadowBias=se.bias,j.shadowNormalBias=se.normalBias,j.shadowRadius=se.radius,j.shadowMapSize=se.mapSize,n.spotShadow[_]=j,n.spotShadowMap[_]=W,b++}_++}else if(L.isRectAreaLight){const k=e.get(L);k.color.copy(U).multiplyScalar(I),k.halfWidth.set(L.width*.5,0,0),k.halfHeight.set(0,L.height*.5,0),n.rectArea[p]=k,p++}else if(L.isPointLight){const k=e.get(L);if(k.color.copy(L.color).multiplyScalar(L.intensity),k.distance=L.distance,k.decay=L.decay,L.castShadow){const se=L.shadow,j=t.get(L);j.shadowBias=se.bias,j.shadowNormalBias=se.normalBias,j.shadowRadius=se.radius,j.shadowMapSize=se.mapSize,j.shadowCameraNear=se.camera.near,j.shadowCameraFar=se.camera.far,n.pointShadow[g]=j,n.pointShadowMap[g]=W,n.pointShadowMatrix[g]=L.shadow.matrix,v++}n.point[g]=k,g++}else if(L.isHemisphereLight){const k=e.get(L);k.skyColor.copy(L.color).multiplyScalar(I),k.groundColor.copy(L.groundColor).multiplyScalar(I),n.hemi[m]=k,m++}}p>0&&(s.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=De.LTC_FLOAT_1,n.rectAreaLTC2=De.LTC_FLOAT_2):(n.rectAreaLTC1=De.LTC_HALF_1,n.rectAreaLTC2=De.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=f,n.ambient[2]=u;const P=n.hash;(P.directionalLength!==d||P.pointLength!==g||P.spotLength!==_||P.rectAreaLength!==p||P.hemiLength!==m||P.numDirectionalShadows!==M||P.numPointShadows!==v||P.numSpotShadows!==b||P.numSpotMaps!==R||P.numLightProbes!==T)&&(n.directional.length=d,n.spot.length=_,n.rectArea.length=p,n.point.length=g,n.hemi.length=m,n.directionalShadow.length=M,n.directionalShadowMap.length=M,n.pointShadow.length=v,n.pointShadowMap.length=v,n.spotShadow.length=b,n.spotShadowMap.length=b,n.directionalShadowMatrix.length=M,n.pointShadowMatrix.length=v,n.spotLightMatrix.length=b+R-w,n.spotLightMap.length=R,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=T,P.directionalLength=d,P.pointLength=g,P.spotLength=_,P.rectAreaLength=p,P.hemiLength=m,P.numDirectionalShadows=M,P.numPointShadows=v,P.numSpotShadows=b,P.numSpotMaps=R,P.numLightProbes=T,n.version=Cg++)}function l(c,h){let f=0,u=0,d=0,g=0,_=0;const p=h.matrixWorldInverse;for(let m=0,M=c.length;m<M;m++){const v=c[m];if(v.isDirectionalLight){const b=n.directional[f];b.direction.setFromMatrixPosition(v.matrixWorld),r.setFromMatrixPosition(v.target.matrixWorld),b.direction.sub(r),b.direction.transformDirection(p),f++}else if(v.isSpotLight){const b=n.spot[d];b.position.setFromMatrixPosition(v.matrixWorld),b.position.applyMatrix4(p),b.direction.setFromMatrixPosition(v.matrixWorld),r.setFromMatrixPosition(v.target.matrixWorld),b.direction.sub(r),b.direction.transformDirection(p),d++}else if(v.isRectAreaLight){const b=n.rectArea[g];b.position.setFromMatrixPosition(v.matrixWorld),b.position.applyMatrix4(p),a.identity(),i.copy(v.matrixWorld),i.premultiply(p),a.extractRotation(i),b.halfWidth.set(v.width*.5,0,0),b.halfHeight.set(0,v.height*.5,0),b.halfWidth.applyMatrix4(a),b.halfHeight.applyMatrix4(a),g++}else if(v.isPointLight){const b=n.point[u];b.position.setFromMatrixPosition(v.matrixWorld),b.position.applyMatrix4(p),u++}else if(v.isHemisphereLight){const b=n.hemi[_];b.direction.setFromMatrixPosition(v.matrixWorld),b.direction.transformDirection(p),_++}}}return{setup:o,setupView:l,state:n}}function Ul(s){const e=new Pg(s),t=[],n=[];function r(h){c.camera=h,t.length=0,n.length=0}function i(h){t.push(h)}function a(h){n.push(h)}function o(){e.setup(t)}function l(h){e.setupView(t,h)}const c={lightsArray:t,shadowsArray:n,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:c,setupLights:o,setupLightsView:l,pushLight:i,pushShadow:a}}function Ug(s){let e=new WeakMap;function t(r,i=0){const a=e.get(r);let o;return a===void 0?(o=new Ul(s),e.set(r,[o])):i>=a.length?(o=new Ul(s),a.push(o)):o=a[i],o}function n(){e=new WeakMap}return{get:t,dispose:n}}class Xc extends Bi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Pu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Yc extends Bi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Dg=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Lg=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Ig(s,e,t){let n=new Ha;const r=new Oe,i=new Oe,a=new ht,o=new Xc({depthPacking:Tc}),l=new Yc,c={},h=t.maxTextureSize,f={[Nn]:Ft,[Ft]:Nn,[sn]:sn},u=new It({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Oe},radius:{value:4}},vertexShader:Dg,fragmentShader:Lg}),d=u.clone();d.defines.HORIZONTAL_PASS=1;const g=new zt;g.setAttribute("position",new jt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new Rt(g,u),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=mc;let m=this.type;this.render=function(w,T,P){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||w.length===0)return;const E=s.getRenderTarget(),y=s.getActiveCubeFace(),L=s.getActiveMipmapLevel(),U=s.state;U.setBlending(yn),U.buffers.color.setClear(1,1,1,1),U.buffers.depth.setTest(!0),U.setScissorTest(!1);const I=m!==gn&&this.type===gn,N=m===gn&&this.type!==gn;for(let W=0,k=w.length;W<k;W++){const se=w[W],j=se.shadow;if(j===void 0){console.warn("THREE.WebGLShadowMap:",se,"has no shadow.");continue}if(j.autoUpdate===!1&&j.needsUpdate===!1)continue;r.copy(j.mapSize);const K=j.getFrameExtents();if(r.multiply(K),i.copy(j.mapSize),(r.x>h||r.y>h)&&(r.x>h&&(i.x=Math.floor(h/K.x),r.x=i.x*K.x,j.mapSize.x=i.x),r.y>h&&(i.y=Math.floor(h/K.y),r.y=i.y*K.y,j.mapSize.y=i.y)),j.map===null||I===!0||N===!0){const F=this.type!==gn?{minFilter:Lt,magFilter:Lt}:{};j.map!==null&&j.map.dispose(),j.map=new en(r.x,r.y,F),j.map.texture.name=se.name+".shadowMap",j.camera.updateProjectionMatrix()}s.setRenderTarget(j.map),s.clear();const q=j.getViewportCount();for(let F=0;F<q;F++){const H=j.getViewport(F);a.set(i.x*H.x,i.y*H.y,i.x*H.z,i.y*H.w),U.viewport(a),j.updateMatrices(se,F),n=j.getFrustum(),b(T,P,j.camera,se,this.type)}j.isPointLightShadow!==!0&&this.type===gn&&M(j,P),j.needsUpdate=!1}m=this.type,p.needsUpdate=!1,s.setRenderTarget(E,y,L)};function M(w,T){const P=e.update(_);u.defines.VSM_SAMPLES!==w.blurSamples&&(u.defines.VSM_SAMPLES=w.blurSamples,d.defines.VSM_SAMPLES=w.blurSamples,u.needsUpdate=!0,d.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new en(r.x,r.y)),u.uniforms.shadow_pass.value=w.map.texture,u.uniforms.resolution.value=w.mapSize,u.uniforms.radius.value=w.radius,s.setRenderTarget(w.mapPass),s.clear(),s.renderBufferDirect(T,null,P,u,_,null),d.uniforms.shadow_pass.value=w.mapPass.texture,d.uniforms.resolution.value=w.mapSize,d.uniforms.radius.value=w.radius,s.setRenderTarget(w.map),s.clear(),s.renderBufferDirect(T,null,P,d,_,null)}function v(w,T,P,E){let y=null;const L=P.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(L!==void 0)y=L;else if(y=P.isPointLight===!0?l:o,s.localClippingEnabled&&T.clipShadows===!0&&Array.isArray(T.clippingPlanes)&&T.clippingPlanes.length!==0||T.displacementMap&&T.displacementScale!==0||T.alphaMap&&T.alphaTest>0||T.map&&T.alphaTest>0){const U=y.uuid,I=T.uuid;let N=c[U];N===void 0&&(N={},c[U]=N);let W=N[I];W===void 0&&(W=y.clone(),N[I]=W,T.addEventListener("dispose",R)),y=W}if(y.visible=T.visible,y.wireframe=T.wireframe,E===gn?y.side=T.shadowSide!==null?T.shadowSide:T.side:y.side=T.shadowSide!==null?T.shadowSide:f[T.side],y.alphaMap=T.alphaMap,y.alphaTest=T.alphaTest,y.map=T.map,y.clipShadows=T.clipShadows,y.clippingPlanes=T.clippingPlanes,y.clipIntersection=T.clipIntersection,y.displacementMap=T.displacementMap,y.displacementScale=T.displacementScale,y.displacementBias=T.displacementBias,y.wireframeLinewidth=T.wireframeLinewidth,y.linewidth=T.linewidth,P.isPointLight===!0&&y.isMeshDistanceMaterial===!0){const U=s.properties.get(y);U.light=P}return y}function b(w,T,P,E,y){if(w.visible===!1)return;if(w.layers.test(T.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&y===gn)&&(!w.frustumCulled||n.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(P.matrixWorldInverse,w.matrixWorld);const I=e.update(w),N=w.material;if(Array.isArray(N)){const W=I.groups;for(let k=0,se=W.length;k<se;k++){const j=W[k],K=N[j.materialIndex];if(K&&K.visible){const q=v(w,K,E,y);w.onBeforeShadow(s,w,T,P,I,q,j),s.renderBufferDirect(P,null,I,q,w,j),w.onAfterShadow(s,w,T,P,I,q,j)}}}else if(N.visible){const W=v(w,N,E,y);w.onBeforeShadow(s,w,T,P,I,W,null),s.renderBufferDirect(P,null,I,W,w,null),w.onAfterShadow(s,w,T,P,I,W,null)}}const U=w.children;for(let I=0,N=U.length;I<N;I++)b(U[I],T,P,E,y)}function R(w){w.target.removeEventListener("dispose",R);for(const P in c){const E=c[P],y=w.target.uuid;y in E&&(E[y].dispose(),delete E[y])}}}function Fg(s){function e(){let S=!1;const $=new ht;let z=null;const ee=new ht(0,0,0,0);return{setMask:function(ge){z!==ge&&!S&&(s.colorMask(ge,ge,ge,ge),z=ge)},setLocked:function(ge){S=ge},setClear:function(ge,Ae,Re,je,We){We===!0&&(ge*=je,Ae*=je,Re*=je),$.set(ge,Ae,Re,je),ee.equals($)===!1&&(s.clearColor(ge,Ae,Re,je),ee.copy($))},reset:function(){S=!1,z=null,ee.set(-1,0,0,0)}}}function t(){let S=!1,$=null,z=null,ee=null;return{setTest:function(ge){ge?te(s.DEPTH_TEST):G(s.DEPTH_TEST)},setMask:function(ge){$!==ge&&!S&&(s.depthMask(ge),$=ge)},setFunc:function(ge){if(z!==ge){switch(ge){case ru:s.depthFunc(s.NEVER);break;case su:s.depthFunc(s.ALWAYS);break;case au:s.depthFunc(s.LESS);break;case cs:s.depthFunc(s.LEQUAL);break;case ou:s.depthFunc(s.EQUAL);break;case lu:s.depthFunc(s.GEQUAL);break;case cu:s.depthFunc(s.GREATER);break;case hu:s.depthFunc(s.NOTEQUAL);break;default:s.depthFunc(s.LEQUAL)}z=ge}},setLocked:function(ge){S=ge},setClear:function(ge){ee!==ge&&(s.clearDepth(ge),ee=ge)},reset:function(){S=!1,$=null,z=null,ee=null}}}function n(){let S=!1,$=null,z=null,ee=null,ge=null,Ae=null,Re=null,je=null,We=null;return{setTest:function(Le){S||(Le?te(s.STENCIL_TEST):G(s.STENCIL_TEST))},setMask:function(Le){$!==Le&&!S&&(s.stencilMask(Le),$=Le)},setFunc:function(Le,Xe,Je){(z!==Le||ee!==Xe||ge!==Je)&&(s.stencilFunc(Le,Xe,Je),z=Le,ee=Xe,ge=Je)},setOp:function(Le,Xe,Je){(Ae!==Le||Re!==Xe||je!==Je)&&(s.stencilOp(Le,Xe,Je),Ae=Le,Re=Xe,je=Je)},setLocked:function(Le){S=Le},setClear:function(Le){We!==Le&&(s.clearStencil(Le),We=Le)},reset:function(){S=!1,$=null,z=null,ee=null,ge=null,Ae=null,Re=null,je=null,We=null}}}const r=new e,i=new t,a=new n,o=new WeakMap,l=new WeakMap;let c={},h={},f=new WeakMap,u=[],d=null,g=!1,_=null,p=null,m=null,M=null,v=null,b=null,R=null,w=new Ye(0,0,0),T=0,P=!1,E=null,y=null,L=null,U=null,I=null;const N=s.getParameter(s.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let W=!1,k=0;const se=s.getParameter(s.VERSION);se.indexOf("WebGL")!==-1?(k=parseFloat(/^WebGL (\d)/.exec(se)[1]),W=k>=1):se.indexOf("OpenGL ES")!==-1&&(k=parseFloat(/^OpenGL ES (\d)/.exec(se)[1]),W=k>=2);let j=null,K={};const q=s.getParameter(s.SCISSOR_BOX),F=s.getParameter(s.VIEWPORT),H=new ht().fromArray(q),ne=new ht().fromArray(F);function O(S,$,z,ee){const ge=new Uint8Array(4),Ae=s.createTexture();s.bindTexture(S,Ae),s.texParameteri(S,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(S,s.TEXTURE_MAG_FILTER,s.NEAREST);for(let Re=0;Re<z;Re++)S===s.TEXTURE_3D||S===s.TEXTURE_2D_ARRAY?s.texImage3D($,0,s.RGBA,1,1,ee,0,s.RGBA,s.UNSIGNED_BYTE,ge):s.texImage2D($+Re,0,s.RGBA,1,1,0,s.RGBA,s.UNSIGNED_BYTE,ge);return Ae}const B={};B[s.TEXTURE_2D]=O(s.TEXTURE_2D,s.TEXTURE_2D,1),B[s.TEXTURE_CUBE_MAP]=O(s.TEXTURE_CUBE_MAP,s.TEXTURE_CUBE_MAP_POSITIVE_X,6),B[s.TEXTURE_2D_ARRAY]=O(s.TEXTURE_2D_ARRAY,s.TEXTURE_2D_ARRAY,1,1),B[s.TEXTURE_3D]=O(s.TEXTURE_3D,s.TEXTURE_3D,1,1),r.setClear(0,0,0,1),i.setClear(1),a.setClear(0),te(s.DEPTH_TEST),i.setFunc(cs),de(!1),ye(fo),te(s.CULL_FACE),Pe(yn);function te(S){c[S]!==!0&&(s.enable(S),c[S]=!0)}function G(S){c[S]!==!1&&(s.disable(S),c[S]=!1)}function oe(S,$){return h[S]!==$?(s.bindFramebuffer(S,$),h[S]=$,S===s.DRAW_FRAMEBUFFER&&(h[s.FRAMEBUFFER]=$),S===s.FRAMEBUFFER&&(h[s.DRAW_FRAMEBUFFER]=$),!0):!1}function pe(S,$){let z=u,ee=!1;if(S){z=f.get($),z===void 0&&(z=[],f.set($,z));const ge=S.textures;if(z.length!==ge.length||z[0]!==s.COLOR_ATTACHMENT0){for(let Ae=0,Re=ge.length;Ae<Re;Ae++)z[Ae]=s.COLOR_ATTACHMENT0+Ae;z.length=ge.length,ee=!0}}else z[0]!==s.BACK&&(z[0]=s.BACK,ee=!0);ee&&s.drawBuffers(z)}function ve(S){return d!==S?(s.useProgram(S),d=S,!0):!1}const D={[Kn]:s.FUNC_ADD,[Gh]:s.FUNC_SUBTRACT,[Hh]:s.FUNC_REVERSE_SUBTRACT};D[Vh]=s.MIN,D[Wh]=s.MAX;const he={[Xh]:s.ZERO,[Yh]:s.ONE,[jh]:s.SRC_COLOR,[Sa]:s.SRC_ALPHA,[$h]:s.SRC_ALPHA_SATURATE,[Jh]:s.DST_COLOR,[Kh]:s.DST_ALPHA,[qh]:s.ONE_MINUS_SRC_COLOR,[Ma]:s.ONE_MINUS_SRC_ALPHA,[Qh]:s.ONE_MINUS_DST_COLOR,[Zh]:s.ONE_MINUS_DST_ALPHA,[eu]:s.CONSTANT_COLOR,[tu]:s.ONE_MINUS_CONSTANT_COLOR,[nu]:s.CONSTANT_ALPHA,[iu]:s.ONE_MINUS_CONSTANT_ALPHA};function Pe(S,$,z,ee,ge,Ae,Re,je,We,Le){if(S===yn){g===!0&&(G(s.BLEND),g=!1);return}if(g===!1&&(te(s.BLEND),g=!0),S!==zh){if(S!==_||Le!==P){if((p!==Kn||v!==Kn)&&(s.blendEquation(s.FUNC_ADD),p=Kn,v=Kn),Le)switch(S){case Ai:s.blendFuncSeparate(s.ONE,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ls:s.blendFunc(s.ONE,s.ONE);break;case po:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case mo:s.blendFuncSeparate(s.ZERO,s.SRC_COLOR,s.ZERO,s.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",S);break}else switch(S){case Ai:s.blendFuncSeparate(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA,s.ONE,s.ONE_MINUS_SRC_ALPHA);break;case ls:s.blendFunc(s.SRC_ALPHA,s.ONE);break;case po:s.blendFuncSeparate(s.ZERO,s.ONE_MINUS_SRC_COLOR,s.ZERO,s.ONE);break;case mo:s.blendFunc(s.ZERO,s.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",S);break}m=null,M=null,b=null,R=null,w.set(0,0,0),T=0,_=S,P=Le}return}ge=ge||$,Ae=Ae||z,Re=Re||ee,($!==p||ge!==v)&&(s.blendEquationSeparate(D[$],D[ge]),p=$,v=ge),(z!==m||ee!==M||Ae!==b||Re!==R)&&(s.blendFuncSeparate(he[z],he[ee],he[Ae],he[Re]),m=z,M=ee,b=Ae,R=Re),(je.equals(w)===!1||We!==T)&&(s.blendColor(je.r,je.g,je.b,We),w.copy(je),T=We),_=S,P=!1}function Ue(S,$){S.side===sn?G(s.CULL_FACE):te(s.CULL_FACE);let z=S.side===Ft;$&&(z=!z),de(z),S.blending===Ai&&S.transparent===!1?Pe(yn):Pe(S.blending,S.blendEquation,S.blendSrc,S.blendDst,S.blendEquationAlpha,S.blendSrcAlpha,S.blendDstAlpha,S.blendColor,S.blendAlpha,S.premultipliedAlpha),i.setFunc(S.depthFunc),i.setTest(S.depthTest),i.setMask(S.depthWrite),r.setMask(S.colorWrite);const ee=S.stencilWrite;a.setTest(ee),ee&&(a.setMask(S.stencilWriteMask),a.setFunc(S.stencilFunc,S.stencilRef,S.stencilFuncMask),a.setOp(S.stencilFail,S.stencilZFail,S.stencilZPass)),fe(S.polygonOffset,S.polygonOffsetFactor,S.polygonOffsetUnits),S.alphaToCoverage===!0?te(s.SAMPLE_ALPHA_TO_COVERAGE):G(s.SAMPLE_ALPHA_TO_COVERAGE)}function de(S){E!==S&&(S?s.frontFace(s.CW):s.frontFace(s.CCW),E=S)}function ye(S){S!==Oh?(te(s.CULL_FACE),S!==y&&(S===fo?s.cullFace(s.BACK):S===Bh?s.cullFace(s.FRONT):s.cullFace(s.FRONT_AND_BACK))):G(s.CULL_FACE),y=S}function Me(S){S!==L&&(W&&s.lineWidth(S),L=S)}function fe(S,$,z){S?(te(s.POLYGON_OFFSET_FILL),(U!==$||I!==z)&&(s.polygonOffset($,z),U=$,I=z)):G(s.POLYGON_OFFSET_FILL)}function Ce(S){S?te(s.SCISSOR_TEST):G(s.SCISSOR_TEST)}function C(S){S===void 0&&(S=s.TEXTURE0+N-1),j!==S&&(s.activeTexture(S),j=S)}function x(S,$,z){z===void 0&&(j===null?z=s.TEXTURE0+N-1:z=j);let ee=K[z];ee===void 0&&(ee={type:void 0,texture:void 0},K[z]=ee),(ee.type!==S||ee.texture!==$)&&(j!==z&&(s.activeTexture(z),j=z),s.bindTexture(S,$||B[S]),ee.type=S,ee.texture=$)}function X(){const S=K[j];S!==void 0&&S.type!==void 0&&(s.bindTexture(S.type,null),S.type=void 0,S.texture=void 0)}function Z(){try{s.compressedTexImage2D.apply(s,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function ie(){try{s.compressedTexImage3D.apply(s,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function Q(){try{s.texSubImage2D.apply(s,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function Te(){try{s.texSubImage3D.apply(s,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function le(){try{s.compressedTexSubImage2D.apply(s,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function ce(){try{s.compressedTexSubImage3D.apply(s,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function Se(){try{s.texStorage2D.apply(s,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function ue(){try{s.texStorage3D.apply(s,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function be(){try{s.texImage2D.apply(s,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function Be(){try{s.texImage3D.apply(s,arguments)}catch(S){console.error("THREE.WebGLState:",S)}}function we(S){H.equals(S)===!1&&(s.scissor(S.x,S.y,S.z,S.w),H.copy(S))}function me(S){ne.equals(S)===!1&&(s.viewport(S.x,S.y,S.z,S.w),ne.copy(S))}function xe(S,$){let z=l.get($);z===void 0&&(z=new WeakMap,l.set($,z));let ee=z.get(S);ee===void 0&&(ee=s.getUniformBlockIndex($,S.name),z.set(S,ee))}function Ne(S,$){const ee=l.get($).get(S);o.get($)!==ee&&(s.uniformBlockBinding($,ee,S.__bindingPointIndex),o.set($,ee))}function Ve(){s.disable(s.BLEND),s.disable(s.CULL_FACE),s.disable(s.DEPTH_TEST),s.disable(s.POLYGON_OFFSET_FILL),s.disable(s.SCISSOR_TEST),s.disable(s.STENCIL_TEST),s.disable(s.SAMPLE_ALPHA_TO_COVERAGE),s.blendEquation(s.FUNC_ADD),s.blendFunc(s.ONE,s.ZERO),s.blendFuncSeparate(s.ONE,s.ZERO,s.ONE,s.ZERO),s.blendColor(0,0,0,0),s.colorMask(!0,!0,!0,!0),s.clearColor(0,0,0,0),s.depthMask(!0),s.depthFunc(s.LESS),s.clearDepth(1),s.stencilMask(4294967295),s.stencilFunc(s.ALWAYS,0,4294967295),s.stencilOp(s.KEEP,s.KEEP,s.KEEP),s.clearStencil(0),s.cullFace(s.BACK),s.frontFace(s.CCW),s.polygonOffset(0,0),s.activeTexture(s.TEXTURE0),s.bindFramebuffer(s.FRAMEBUFFER,null),s.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),s.bindFramebuffer(s.READ_FRAMEBUFFER,null),s.useProgram(null),s.lineWidth(1),s.scissor(0,0,s.canvas.width,s.canvas.height),s.viewport(0,0,s.canvas.width,s.canvas.height),c={},j=null,K={},h={},f=new WeakMap,u=[],d=null,g=!1,_=null,p=null,m=null,M=null,v=null,b=null,R=null,w=new Ye(0,0,0),T=0,P=!1,E=null,y=null,L=null,U=null,I=null,H.set(0,0,s.canvas.width,s.canvas.height),ne.set(0,0,s.canvas.width,s.canvas.height),r.reset(),i.reset(),a.reset()}return{buffers:{color:r,depth:i,stencil:a},enable:te,disable:G,bindFramebuffer:oe,drawBuffers:pe,useProgram:ve,setBlending:Pe,setMaterial:Ue,setFlipSided:de,setCullFace:ye,setLineWidth:Me,setPolygonOffset:fe,setScissorTest:Ce,activeTexture:C,bindTexture:x,unbindTexture:X,compressedTexImage2D:Z,compressedTexImage3D:ie,texImage2D:be,texImage3D:Be,updateUBOMapping:xe,uniformBlockBinding:Ne,texStorage2D:Se,texStorage3D:ue,texSubImage2D:Q,texSubImage3D:Te,compressedTexSubImage2D:le,compressedTexSubImage3D:ce,scissor:we,viewport:me,reset:Ve}}function Ng(s,e,t,n,r,i,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Oe,h=new WeakMap;let f;const u=new WeakMap;let d=!1;try{d=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(C,x){return d?new OffscreenCanvas(C,x):ms("canvas")}function _(C,x,X){let Z=1;const ie=Ce(C);if((ie.width>X||ie.height>X)&&(Z=X/Math.max(ie.width,ie.height)),Z<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){const Q=Math.floor(Z*ie.width),Te=Math.floor(Z*ie.height);f===void 0&&(f=g(Q,Te));const le=x?g(Q,Te):f;return le.width=Q,le.height=Te,le.getContext("2d").drawImage(C,0,0,Q,Te),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+ie.width+"x"+ie.height+") to ("+Q+"x"+Te+")."),le}else return"data"in C&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+ie.width+"x"+ie.height+")."),C;return C}function p(C){return C.generateMipmaps&&C.minFilter!==Lt&&C.minFilter!==kt}function m(C){s.generateMipmap(C)}function M(C,x,X,Z,ie=!1){if(C!==null){if(s[C]!==void 0)return s[C];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let Q=x;if(x===s.RED&&(X===s.FLOAT&&(Q=s.R32F),X===s.HALF_FLOAT&&(Q=s.R16F),X===s.UNSIGNED_BYTE&&(Q=s.R8)),x===s.RED_INTEGER&&(X===s.UNSIGNED_BYTE&&(Q=s.R8UI),X===s.UNSIGNED_SHORT&&(Q=s.R16UI),X===s.UNSIGNED_INT&&(Q=s.R32UI),X===s.BYTE&&(Q=s.R8I),X===s.SHORT&&(Q=s.R16I),X===s.INT&&(Q=s.R32I)),x===s.RG&&(X===s.FLOAT&&(Q=s.RG32F),X===s.HALF_FLOAT&&(Q=s.RG16F),X===s.UNSIGNED_BYTE&&(Q=s.RG8)),x===s.RG_INTEGER&&(X===s.UNSIGNED_BYTE&&(Q=s.RG8UI),X===s.UNSIGNED_SHORT&&(Q=s.RG16UI),X===s.UNSIGNED_INT&&(Q=s.RG32UI),X===s.BYTE&&(Q=s.RG8I),X===s.SHORT&&(Q=s.RG16I),X===s.INT&&(Q=s.RG32I)),x===s.RGB&&X===s.UNSIGNED_INT_5_9_9_9_REV&&(Q=s.RGB9_E5),x===s.RGBA){const Te=ie?us:nt.getTransfer(Z);X===s.FLOAT&&(Q=s.RGBA32F),X===s.HALF_FLOAT&&(Q=s.RGBA16F),X===s.UNSIGNED_BYTE&&(Q=Te===at?s.SRGB8_ALPHA8:s.RGBA8),X===s.UNSIGNED_SHORT_4_4_4_4&&(Q=s.RGBA4),X===s.UNSIGNED_SHORT_5_5_5_1&&(Q=s.RGB5_A1)}return(Q===s.R16F||Q===s.R32F||Q===s.RG16F||Q===s.RG32F||Q===s.RGBA16F||Q===s.RGBA32F)&&e.get("EXT_color_buffer_float"),Q}function v(C,x){let X;return C?x===null||x===Li||x===Ii?X=s.DEPTH24_STENCIL8:x===vn?X=s.DEPTH32F_STENCIL8:x===hs&&(X=s.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):x===null||x===Li||x===Ii?X=s.DEPTH_COMPONENT24:x===vn?X=s.DEPTH_COMPONENT32F:x===hs&&(X=s.DEPTH_COMPONENT16),X}function b(C,x){return p(C)===!0||C.isFramebufferTexture&&C.minFilter!==Lt&&C.minFilter!==kt?Math.log2(Math.max(x.width,x.height))+1:C.mipmaps!==void 0&&C.mipmaps.length>0?C.mipmaps.length:C.isCompressedTexture&&Array.isArray(C.image)?x.mipmaps.length:1}function R(C){const x=C.target;x.removeEventListener("dispose",R),T(x),x.isVideoTexture&&h.delete(x)}function w(C){const x=C.target;x.removeEventListener("dispose",w),E(x)}function T(C){const x=n.get(C);if(x.__webglInit===void 0)return;const X=C.source,Z=u.get(X);if(Z){const ie=Z[x.__cacheKey];ie.usedTimes--,ie.usedTimes===0&&P(C),Object.keys(Z).length===0&&u.delete(X)}n.remove(C)}function P(C){const x=n.get(C);s.deleteTexture(x.__webglTexture);const X=C.source,Z=u.get(X);delete Z[x.__cacheKey],a.memory.textures--}function E(C){const x=n.get(C);if(C.depthTexture&&C.depthTexture.dispose(),C.isWebGLCubeRenderTarget)for(let Z=0;Z<6;Z++){if(Array.isArray(x.__webglFramebuffer[Z]))for(let ie=0;ie<x.__webglFramebuffer[Z].length;ie++)s.deleteFramebuffer(x.__webglFramebuffer[Z][ie]);else s.deleteFramebuffer(x.__webglFramebuffer[Z]);x.__webglDepthbuffer&&s.deleteRenderbuffer(x.__webglDepthbuffer[Z])}else{if(Array.isArray(x.__webglFramebuffer))for(let Z=0;Z<x.__webglFramebuffer.length;Z++)s.deleteFramebuffer(x.__webglFramebuffer[Z]);else s.deleteFramebuffer(x.__webglFramebuffer);if(x.__webglDepthbuffer&&s.deleteRenderbuffer(x.__webglDepthbuffer),x.__webglMultisampledFramebuffer&&s.deleteFramebuffer(x.__webglMultisampledFramebuffer),x.__webglColorRenderbuffer)for(let Z=0;Z<x.__webglColorRenderbuffer.length;Z++)x.__webglColorRenderbuffer[Z]&&s.deleteRenderbuffer(x.__webglColorRenderbuffer[Z]);x.__webglDepthRenderbuffer&&s.deleteRenderbuffer(x.__webglDepthRenderbuffer)}const X=C.textures;for(let Z=0,ie=X.length;Z<ie;Z++){const Q=n.get(X[Z]);Q.__webglTexture&&(s.deleteTexture(Q.__webglTexture),a.memory.textures--),n.remove(X[Z])}n.remove(C)}let y=0;function L(){y=0}function U(){const C=y;return C>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+C+" texture units while this GPU supports only "+r.maxTextures),y+=1,C}function I(C){const x=[];return x.push(C.wrapS),x.push(C.wrapT),x.push(C.wrapR||0),x.push(C.magFilter),x.push(C.minFilter),x.push(C.anisotropy),x.push(C.internalFormat),x.push(C.format),x.push(C.type),x.push(C.generateMipmaps),x.push(C.premultiplyAlpha),x.push(C.flipY),x.push(C.unpackAlignment),x.push(C.colorSpace),x.join()}function N(C,x){const X=n.get(C);if(C.isVideoTexture&&Me(C),C.isRenderTargetTexture===!1&&C.version>0&&X.__version!==C.version){const Z=C.image;if(Z===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(Z.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{ne(X,C,x);return}}t.bindTexture(s.TEXTURE_2D,X.__webglTexture,s.TEXTURE0+x)}function W(C,x){const X=n.get(C);if(C.version>0&&X.__version!==C.version){ne(X,C,x);return}t.bindTexture(s.TEXTURE_2D_ARRAY,X.__webglTexture,s.TEXTURE0+x)}function k(C,x){const X=n.get(C);if(C.version>0&&X.__version!==C.version){ne(X,C,x);return}t.bindTexture(s.TEXTURE_3D,X.__webglTexture,s.TEXTURE0+x)}function se(C,x){const X=n.get(C);if(C.version>0&&X.__version!==C.version){O(X,C,x);return}t.bindTexture(s.TEXTURE_CUBE_MAP,X.__webglTexture,s.TEXTURE0+x)}const j={[Ta]:s.REPEAT,[Jn]:s.CLAMP_TO_EDGE,[wa]:s.MIRRORED_REPEAT},K={[Lt]:s.NEAREST,[yu]:s.NEAREST_MIPMAP_NEAREST,[Tr]:s.NEAREST_MIPMAP_LINEAR,[kt]:s.LINEAR,[Os]:s.LINEAR_MIPMAP_NEAREST,[Qn]:s.LINEAR_MIPMAP_LINEAR},q={[Du]:s.NEVER,[Bu]:s.ALWAYS,[Lu]:s.LESS,[Ac]:s.LEQUAL,[Iu]:s.EQUAL,[Ou]:s.GEQUAL,[Fu]:s.GREATER,[Nu]:s.NOTEQUAL};function F(C,x){if(x.type===vn&&e.has("OES_texture_float_linear")===!1&&(x.magFilter===kt||x.magFilter===Os||x.magFilter===Tr||x.magFilter===Qn||x.minFilter===kt||x.minFilter===Os||x.minFilter===Tr||x.minFilter===Qn)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),s.texParameteri(C,s.TEXTURE_WRAP_S,j[x.wrapS]),s.texParameteri(C,s.TEXTURE_WRAP_T,j[x.wrapT]),(C===s.TEXTURE_3D||C===s.TEXTURE_2D_ARRAY)&&s.texParameteri(C,s.TEXTURE_WRAP_R,j[x.wrapR]),s.texParameteri(C,s.TEXTURE_MAG_FILTER,K[x.magFilter]),s.texParameteri(C,s.TEXTURE_MIN_FILTER,K[x.minFilter]),x.compareFunction&&(s.texParameteri(C,s.TEXTURE_COMPARE_MODE,s.COMPARE_REF_TO_TEXTURE),s.texParameteri(C,s.TEXTURE_COMPARE_FUNC,q[x.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(x.magFilter===Lt||x.minFilter!==Tr&&x.minFilter!==Qn||x.type===vn&&e.has("OES_texture_float_linear")===!1)return;if(x.anisotropy>1||n.get(x).__currentAnisotropy){const X=e.get("EXT_texture_filter_anisotropic");s.texParameterf(C,X.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,r.getMaxAnisotropy())),n.get(x).__currentAnisotropy=x.anisotropy}}}function H(C,x){let X=!1;C.__webglInit===void 0&&(C.__webglInit=!0,x.addEventListener("dispose",R));const Z=x.source;let ie=u.get(Z);ie===void 0&&(ie={},u.set(Z,ie));const Q=I(x);if(Q!==C.__cacheKey){ie[Q]===void 0&&(ie[Q]={texture:s.createTexture(),usedTimes:0},a.memory.textures++,X=!0),ie[Q].usedTimes++;const Te=ie[C.__cacheKey];Te!==void 0&&(ie[C.__cacheKey].usedTimes--,Te.usedTimes===0&&P(x)),C.__cacheKey=Q,C.__webglTexture=ie[Q].texture}return X}function ne(C,x,X){let Z=s.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(Z=s.TEXTURE_2D_ARRAY),x.isData3DTexture&&(Z=s.TEXTURE_3D);const ie=H(C,x),Q=x.source;t.bindTexture(Z,C.__webglTexture,s.TEXTURE0+X);const Te=n.get(Q);if(Q.version!==Te.__version||ie===!0){t.activeTexture(s.TEXTURE0+X);const le=nt.getPrimaries(nt.workingColorSpace),ce=x.colorSpace===Ln?null:nt.getPrimaries(x.colorSpace),Se=x.colorSpace===Ln||le===ce?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,x.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,x.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,Se);let ue=_(x.image,!1,r.maxTextureSize);ue=fe(x,ue);const be=i.convert(x.format,x.colorSpace),Be=i.convert(x.type);let we=M(x.internalFormat,be,Be,x.colorSpace,x.isVideoTexture);F(Z,x);let me;const xe=x.mipmaps,Ne=x.isVideoTexture!==!0,Ve=Te.__version===void 0||ie===!0,S=Q.dataReady,$=b(x,ue);if(x.isDepthTexture)we=v(x.format===Fi,x.type),Ve&&(Ne?t.texStorage2D(s.TEXTURE_2D,1,we,ue.width,ue.height):t.texImage2D(s.TEXTURE_2D,0,we,ue.width,ue.height,0,be,Be,null));else if(x.isDataTexture)if(xe.length>0){Ne&&Ve&&t.texStorage2D(s.TEXTURE_2D,$,we,xe[0].width,xe[0].height);for(let z=0,ee=xe.length;z<ee;z++)me=xe[z],Ne?S&&t.texSubImage2D(s.TEXTURE_2D,z,0,0,me.width,me.height,be,Be,me.data):t.texImage2D(s.TEXTURE_2D,z,we,me.width,me.height,0,be,Be,me.data);x.generateMipmaps=!1}else Ne?(Ve&&t.texStorage2D(s.TEXTURE_2D,$,we,ue.width,ue.height),S&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,ue.width,ue.height,be,Be,ue.data)):t.texImage2D(s.TEXTURE_2D,0,we,ue.width,ue.height,0,be,Be,ue.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){Ne&&Ve&&t.texStorage3D(s.TEXTURE_2D_ARRAY,$,we,xe[0].width,xe[0].height,ue.depth);for(let z=0,ee=xe.length;z<ee;z++)if(me=xe[z],x.format!==on)if(be!==null)if(Ne){if(S)if(x.layerUpdates.size>0){for(const ge of x.layerUpdates){const Ae=me.width*me.height;t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,z,0,0,ge,me.width,me.height,1,be,me.data.slice(Ae*ge,Ae*(ge+1)),0,0)}x.clearLayerUpdates()}else t.compressedTexSubImage3D(s.TEXTURE_2D_ARRAY,z,0,0,0,me.width,me.height,ue.depth,be,me.data,0,0)}else t.compressedTexImage3D(s.TEXTURE_2D_ARRAY,z,we,me.width,me.height,ue.depth,0,me.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Ne?S&&t.texSubImage3D(s.TEXTURE_2D_ARRAY,z,0,0,0,me.width,me.height,ue.depth,be,Be,me.data):t.texImage3D(s.TEXTURE_2D_ARRAY,z,we,me.width,me.height,ue.depth,0,be,Be,me.data)}else{Ne&&Ve&&t.texStorage2D(s.TEXTURE_2D,$,we,xe[0].width,xe[0].height);for(let z=0,ee=xe.length;z<ee;z++)me=xe[z],x.format!==on?be!==null?Ne?S&&t.compressedTexSubImage2D(s.TEXTURE_2D,z,0,0,me.width,me.height,be,me.data):t.compressedTexImage2D(s.TEXTURE_2D,z,we,me.width,me.height,0,me.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ne?S&&t.texSubImage2D(s.TEXTURE_2D,z,0,0,me.width,me.height,be,Be,me.data):t.texImage2D(s.TEXTURE_2D,z,we,me.width,me.height,0,be,Be,me.data)}else if(x.isDataArrayTexture)if(Ne){if(Ve&&t.texStorage3D(s.TEXTURE_2D_ARRAY,$,we,ue.width,ue.height,ue.depth),S)if(x.layerUpdates.size>0){let z;switch(Be){case s.UNSIGNED_BYTE:switch(be){case s.ALPHA:z=1;break;case s.LUMINANCE:z=1;break;case s.LUMINANCE_ALPHA:z=2;break;case s.RGB:z=3;break;case s.RGBA:z=4;break;default:throw new Error(`Unknown texel size for format ${be}.`)}break;case s.UNSIGNED_SHORT_4_4_4_4:case s.UNSIGNED_SHORT_5_5_5_1:case s.UNSIGNED_SHORT_5_6_5:z=1;break;default:throw new Error(`Unknown texel size for type ${Be}.`)}const ee=ue.width*ue.height*z;for(const ge of x.layerUpdates)t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,ge,ue.width,ue.height,1,be,Be,ue.data.slice(ee*ge,ee*(ge+1)));x.clearLayerUpdates()}else t.texSubImage3D(s.TEXTURE_2D_ARRAY,0,0,0,0,ue.width,ue.height,ue.depth,be,Be,ue.data)}else t.texImage3D(s.TEXTURE_2D_ARRAY,0,we,ue.width,ue.height,ue.depth,0,be,Be,ue.data);else if(x.isData3DTexture)Ne?(Ve&&t.texStorage3D(s.TEXTURE_3D,$,we,ue.width,ue.height,ue.depth),S&&t.texSubImage3D(s.TEXTURE_3D,0,0,0,0,ue.width,ue.height,ue.depth,be,Be,ue.data)):t.texImage3D(s.TEXTURE_3D,0,we,ue.width,ue.height,ue.depth,0,be,Be,ue.data);else if(x.isFramebufferTexture){if(Ve)if(Ne)t.texStorage2D(s.TEXTURE_2D,$,we,ue.width,ue.height);else{let z=ue.width,ee=ue.height;for(let ge=0;ge<$;ge++)t.texImage2D(s.TEXTURE_2D,ge,we,z,ee,0,be,Be,null),z>>=1,ee>>=1}}else if(xe.length>0){if(Ne&&Ve){const z=Ce(xe[0]);t.texStorage2D(s.TEXTURE_2D,$,we,z.width,z.height)}for(let z=0,ee=xe.length;z<ee;z++)me=xe[z],Ne?S&&t.texSubImage2D(s.TEXTURE_2D,z,0,0,be,Be,me):t.texImage2D(s.TEXTURE_2D,z,we,be,Be,me);x.generateMipmaps=!1}else if(Ne){if(Ve){const z=Ce(ue);t.texStorage2D(s.TEXTURE_2D,$,we,z.width,z.height)}S&&t.texSubImage2D(s.TEXTURE_2D,0,0,0,be,Be,ue)}else t.texImage2D(s.TEXTURE_2D,0,we,be,Be,ue);p(x)&&m(Z),Te.__version=Q.version,x.onUpdate&&x.onUpdate(x)}C.__version=x.version}function O(C,x,X){if(x.image.length!==6)return;const Z=H(C,x),ie=x.source;t.bindTexture(s.TEXTURE_CUBE_MAP,C.__webglTexture,s.TEXTURE0+X);const Q=n.get(ie);if(ie.version!==Q.__version||Z===!0){t.activeTexture(s.TEXTURE0+X);const Te=nt.getPrimaries(nt.workingColorSpace),le=x.colorSpace===Ln?null:nt.getPrimaries(x.colorSpace),ce=x.colorSpace===Ln||Te===le?s.NONE:s.BROWSER_DEFAULT_WEBGL;s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,x.flipY),s.pixelStorei(s.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),s.pixelStorei(s.UNPACK_ALIGNMENT,x.unpackAlignment),s.pixelStorei(s.UNPACK_COLORSPACE_CONVERSION_WEBGL,ce);const Se=x.isCompressedTexture||x.image[0].isCompressedTexture,ue=x.image[0]&&x.image[0].isDataTexture,be=[];for(let ee=0;ee<6;ee++)!Se&&!ue?be[ee]=_(x.image[ee],!0,r.maxCubemapSize):be[ee]=ue?x.image[ee].image:x.image[ee],be[ee]=fe(x,be[ee]);const Be=be[0],we=i.convert(x.format,x.colorSpace),me=i.convert(x.type),xe=M(x.internalFormat,we,me,x.colorSpace),Ne=x.isVideoTexture!==!0,Ve=Q.__version===void 0||Z===!0,S=ie.dataReady;let $=b(x,Be);F(s.TEXTURE_CUBE_MAP,x);let z;if(Se){Ne&&Ve&&t.texStorage2D(s.TEXTURE_CUBE_MAP,$,xe,Be.width,Be.height);for(let ee=0;ee<6;ee++){z=be[ee].mipmaps;for(let ge=0;ge<z.length;ge++){const Ae=z[ge];x.format!==on?we!==null?Ne?S&&t.compressedTexSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,ge,0,0,Ae.width,Ae.height,we,Ae.data):t.compressedTexImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,ge,xe,Ae.width,Ae.height,0,Ae.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Ne?S&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,ge,0,0,Ae.width,Ae.height,we,me,Ae.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,ge,xe,Ae.width,Ae.height,0,we,me,Ae.data)}}}else{if(z=x.mipmaps,Ne&&Ve){z.length>0&&$++;const ee=Ce(be[0]);t.texStorage2D(s.TEXTURE_CUBE_MAP,$,xe,ee.width,ee.height)}for(let ee=0;ee<6;ee++)if(ue){Ne?S&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,be[ee].width,be[ee].height,we,me,be[ee].data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,xe,be[ee].width,be[ee].height,0,we,me,be[ee].data);for(let ge=0;ge<z.length;ge++){const Re=z[ge].image[ee].image;Ne?S&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,ge+1,0,0,Re.width,Re.height,we,me,Re.data):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,ge+1,xe,Re.width,Re.height,0,we,me,Re.data)}}else{Ne?S&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,we,me,be[ee]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,xe,we,me,be[ee]);for(let ge=0;ge<z.length;ge++){const Ae=z[ge];Ne?S&&t.texSubImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,ge+1,0,0,we,me,Ae.image[ee]):t.texImage2D(s.TEXTURE_CUBE_MAP_POSITIVE_X+ee,ge+1,xe,we,me,Ae.image[ee])}}}p(x)&&m(s.TEXTURE_CUBE_MAP),Q.__version=ie.version,x.onUpdate&&x.onUpdate(x)}C.__version=x.version}function B(C,x,X,Z,ie,Q){const Te=i.convert(X.format,X.colorSpace),le=i.convert(X.type),ce=M(X.internalFormat,Te,le,X.colorSpace);if(!n.get(x).__hasExternalTextures){const ue=Math.max(1,x.width>>Q),be=Math.max(1,x.height>>Q);ie===s.TEXTURE_3D||ie===s.TEXTURE_2D_ARRAY?t.texImage3D(ie,Q,ce,ue,be,x.depth,0,Te,le,null):t.texImage2D(ie,Q,ce,ue,be,0,Te,le,null)}t.bindFramebuffer(s.FRAMEBUFFER,C),ye(x)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,Z,ie,n.get(X).__webglTexture,0,de(x)):(ie===s.TEXTURE_2D||ie>=s.TEXTURE_CUBE_MAP_POSITIVE_X&&ie<=s.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&s.framebufferTexture2D(s.FRAMEBUFFER,Z,ie,n.get(X).__webglTexture,Q),t.bindFramebuffer(s.FRAMEBUFFER,null)}function te(C,x,X){if(s.bindRenderbuffer(s.RENDERBUFFER,C),x.depthBuffer){const Z=x.depthTexture,ie=Z&&Z.isDepthTexture?Z.type:null,Q=v(x.stencilBuffer,ie),Te=x.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,le=de(x);ye(x)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,le,Q,x.width,x.height):X?s.renderbufferStorageMultisample(s.RENDERBUFFER,le,Q,x.width,x.height):s.renderbufferStorage(s.RENDERBUFFER,Q,x.width,x.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,Te,s.RENDERBUFFER,C)}else{const Z=x.textures;for(let ie=0;ie<Z.length;ie++){const Q=Z[ie],Te=i.convert(Q.format,Q.colorSpace),le=i.convert(Q.type),ce=M(Q.internalFormat,Te,le,Q.colorSpace),Se=de(x);X&&ye(x)===!1?s.renderbufferStorageMultisample(s.RENDERBUFFER,Se,ce,x.width,x.height):ye(x)?o.renderbufferStorageMultisampleEXT(s.RENDERBUFFER,Se,ce,x.width,x.height):s.renderbufferStorage(s.RENDERBUFFER,ce,x.width,x.height)}}s.bindRenderbuffer(s.RENDERBUFFER,null)}function G(C,x){if(x&&x.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(s.FRAMEBUFFER,C),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!n.get(x.depthTexture).__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),N(x.depthTexture,0);const Z=n.get(x.depthTexture).__webglTexture,ie=de(x);if(x.depthTexture.format===Ci)ye(x)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,Z,0,ie):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_ATTACHMENT,s.TEXTURE_2D,Z,0);else if(x.depthTexture.format===Fi)ye(x)?o.framebufferTexture2DMultisampleEXT(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,Z,0,ie):s.framebufferTexture2D(s.FRAMEBUFFER,s.DEPTH_STENCIL_ATTACHMENT,s.TEXTURE_2D,Z,0);else throw new Error("Unknown depthTexture format")}function oe(C){const x=n.get(C),X=C.isWebGLCubeRenderTarget===!0;if(C.depthTexture&&!x.__autoAllocateDepthBuffer){if(X)throw new Error("target.depthTexture not supported in Cube render targets");G(x.__webglFramebuffer,C)}else if(X){x.__webglDepthbuffer=[];for(let Z=0;Z<6;Z++)t.bindFramebuffer(s.FRAMEBUFFER,x.__webglFramebuffer[Z]),x.__webglDepthbuffer[Z]=s.createRenderbuffer(),te(x.__webglDepthbuffer[Z],C,!1)}else t.bindFramebuffer(s.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer=s.createRenderbuffer(),te(x.__webglDepthbuffer,C,!1);t.bindFramebuffer(s.FRAMEBUFFER,null)}function pe(C,x,X){const Z=n.get(C);x!==void 0&&B(Z.__webglFramebuffer,C,C.texture,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,0),X!==void 0&&oe(C)}function ve(C){const x=C.texture,X=n.get(C),Z=n.get(x);C.addEventListener("dispose",w);const ie=C.textures,Q=C.isWebGLCubeRenderTarget===!0,Te=ie.length>1;if(Te||(Z.__webglTexture===void 0&&(Z.__webglTexture=s.createTexture()),Z.__version=x.version,a.memory.textures++),Q){X.__webglFramebuffer=[];for(let le=0;le<6;le++)if(x.mipmaps&&x.mipmaps.length>0){X.__webglFramebuffer[le]=[];for(let ce=0;ce<x.mipmaps.length;ce++)X.__webglFramebuffer[le][ce]=s.createFramebuffer()}else X.__webglFramebuffer[le]=s.createFramebuffer()}else{if(x.mipmaps&&x.mipmaps.length>0){X.__webglFramebuffer=[];for(let le=0;le<x.mipmaps.length;le++)X.__webglFramebuffer[le]=s.createFramebuffer()}else X.__webglFramebuffer=s.createFramebuffer();if(Te)for(let le=0,ce=ie.length;le<ce;le++){const Se=n.get(ie[le]);Se.__webglTexture===void 0&&(Se.__webglTexture=s.createTexture(),a.memory.textures++)}if(C.samples>0&&ye(C)===!1){X.__webglMultisampledFramebuffer=s.createFramebuffer(),X.__webglColorRenderbuffer=[],t.bindFramebuffer(s.FRAMEBUFFER,X.__webglMultisampledFramebuffer);for(let le=0;le<ie.length;le++){const ce=ie[le];X.__webglColorRenderbuffer[le]=s.createRenderbuffer(),s.bindRenderbuffer(s.RENDERBUFFER,X.__webglColorRenderbuffer[le]);const Se=i.convert(ce.format,ce.colorSpace),ue=i.convert(ce.type),be=M(ce.internalFormat,Se,ue,ce.colorSpace,C.isXRRenderTarget===!0),Be=de(C);s.renderbufferStorageMultisample(s.RENDERBUFFER,Be,be,C.width,C.height),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+le,s.RENDERBUFFER,X.__webglColorRenderbuffer[le])}s.bindRenderbuffer(s.RENDERBUFFER,null),C.depthBuffer&&(X.__webglDepthRenderbuffer=s.createRenderbuffer(),te(X.__webglDepthRenderbuffer,C,!0)),t.bindFramebuffer(s.FRAMEBUFFER,null)}}if(Q){t.bindTexture(s.TEXTURE_CUBE_MAP,Z.__webglTexture),F(s.TEXTURE_CUBE_MAP,x);for(let le=0;le<6;le++)if(x.mipmaps&&x.mipmaps.length>0)for(let ce=0;ce<x.mipmaps.length;ce++)B(X.__webglFramebuffer[le][ce],C,x,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+le,ce);else B(X.__webglFramebuffer[le],C,x,s.COLOR_ATTACHMENT0,s.TEXTURE_CUBE_MAP_POSITIVE_X+le,0);p(x)&&m(s.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Te){for(let le=0,ce=ie.length;le<ce;le++){const Se=ie[le],ue=n.get(Se);t.bindTexture(s.TEXTURE_2D,ue.__webglTexture),F(s.TEXTURE_2D,Se),B(X.__webglFramebuffer,C,Se,s.COLOR_ATTACHMENT0+le,s.TEXTURE_2D,0),p(Se)&&m(s.TEXTURE_2D)}t.unbindTexture()}else{let le=s.TEXTURE_2D;if((C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)&&(le=C.isWebGL3DRenderTarget?s.TEXTURE_3D:s.TEXTURE_2D_ARRAY),t.bindTexture(le,Z.__webglTexture),F(le,x),x.mipmaps&&x.mipmaps.length>0)for(let ce=0;ce<x.mipmaps.length;ce++)B(X.__webglFramebuffer[ce],C,x,s.COLOR_ATTACHMENT0,le,ce);else B(X.__webglFramebuffer,C,x,s.COLOR_ATTACHMENT0,le,0);p(x)&&m(le),t.unbindTexture()}C.depthBuffer&&oe(C)}function D(C){const x=C.textures;for(let X=0,Z=x.length;X<Z;X++){const ie=x[X];if(p(ie)){const Q=C.isWebGLCubeRenderTarget?s.TEXTURE_CUBE_MAP:s.TEXTURE_2D,Te=n.get(ie).__webglTexture;t.bindTexture(Q,Te),m(Q),t.unbindTexture()}}}const he=[],Pe=[];function Ue(C){if(C.samples>0){if(ye(C)===!1){const x=C.textures,X=C.width,Z=C.height;let ie=s.COLOR_BUFFER_BIT;const Q=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT,Te=n.get(C),le=x.length>1;if(le)for(let ce=0;ce<x.length;ce++)t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+ce,s.RENDERBUFFER,null),t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+ce,s.TEXTURE_2D,null,0);t.bindFramebuffer(s.READ_FRAMEBUFFER,Te.__webglMultisampledFramebuffer),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Te.__webglFramebuffer);for(let ce=0;ce<x.length;ce++){if(C.resolveDepthBuffer&&(C.depthBuffer&&(ie|=s.DEPTH_BUFFER_BIT),C.stencilBuffer&&C.resolveStencilBuffer&&(ie|=s.STENCIL_BUFFER_BIT)),le){s.framebufferRenderbuffer(s.READ_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.RENDERBUFFER,Te.__webglColorRenderbuffer[ce]);const Se=n.get(x[ce]).__webglTexture;s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,Se,0)}s.blitFramebuffer(0,0,X,Z,0,0,X,Z,ie,s.NEAREST),l===!0&&(he.length=0,Pe.length=0,he.push(s.COLOR_ATTACHMENT0+ce),C.depthBuffer&&C.resolveDepthBuffer===!1&&(he.push(Q),Pe.push(Q),s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,Pe)),s.invalidateFramebuffer(s.READ_FRAMEBUFFER,he))}if(t.bindFramebuffer(s.READ_FRAMEBUFFER,null),t.bindFramebuffer(s.DRAW_FRAMEBUFFER,null),le)for(let ce=0;ce<x.length;ce++){t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglMultisampledFramebuffer),s.framebufferRenderbuffer(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0+ce,s.RENDERBUFFER,Te.__webglColorRenderbuffer[ce]);const Se=n.get(x[ce]).__webglTexture;t.bindFramebuffer(s.FRAMEBUFFER,Te.__webglFramebuffer),s.framebufferTexture2D(s.DRAW_FRAMEBUFFER,s.COLOR_ATTACHMENT0+ce,s.TEXTURE_2D,Se,0)}t.bindFramebuffer(s.DRAW_FRAMEBUFFER,Te.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.resolveDepthBuffer===!1&&l){const x=C.stencilBuffer?s.DEPTH_STENCIL_ATTACHMENT:s.DEPTH_ATTACHMENT;s.invalidateFramebuffer(s.DRAW_FRAMEBUFFER,[x])}}}function de(C){return Math.min(r.maxSamples,C.samples)}function ye(C){const x=n.get(C);return C.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function Me(C){const x=a.render.frame;h.get(C)!==x&&(h.set(C,x),C.update())}function fe(C,x){const X=C.colorSpace,Z=C.format,ie=C.type;return C.isCompressedTexture===!0||C.isVideoTexture===!0||X!==Bn&&X!==Ln&&(nt.getTransfer(X)===at?(Z!==on||ie!==On)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",X)),x}function Ce(C){return typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement?(c.width=C.naturalWidth||C.width,c.height=C.naturalHeight||C.height):typeof VideoFrame<"u"&&C instanceof VideoFrame?(c.width=C.displayWidth,c.height=C.displayHeight):(c.width=C.width,c.height=C.height),c}this.allocateTextureUnit=U,this.resetTextureUnits=L,this.setTexture2D=N,this.setTexture2DArray=W,this.setTexture3D=k,this.setTextureCube=se,this.rebindTextures=pe,this.setupRenderTarget=ve,this.updateRenderTargetMipmap=D,this.updateMultisampleRenderTarget=Ue,this.setupDepthRenderbuffer=oe,this.setupFrameBufferTexture=B,this.useMultisampledRTT=ye}function Og(s,e){function t(n,r=Ln){let i;const a=nt.getTransfer(r);if(n===On)return s.UNSIGNED_BYTE;if(n===xc)return s.UNSIGNED_SHORT_4_4_4_4;if(n===yc)return s.UNSIGNED_SHORT_5_5_5_1;if(n===bu)return s.UNSIGNED_INT_5_9_9_9_REV;if(n===Su)return s.BYTE;if(n===Mu)return s.SHORT;if(n===hs)return s.UNSIGNED_SHORT;if(n===vc)return s.INT;if(n===Li)return s.UNSIGNED_INT;if(n===vn)return s.FLOAT;if(n===Fn)return s.HALF_FLOAT;if(n===Eu)return s.ALPHA;if(n===Tu)return s.RGB;if(n===on)return s.RGBA;if(n===wu)return s.LUMINANCE;if(n===Au)return s.LUMINANCE_ALPHA;if(n===Ci)return s.DEPTH_COMPONENT;if(n===Fi)return s.DEPTH_STENCIL;if(n===Sc)return s.RED;if(n===Mc)return s.RED_INTEGER;if(n===Cu)return s.RG;if(n===bc)return s.RG_INTEGER;if(n===Ec)return s.RGBA_INTEGER;if(n===Bs||n===ks||n===zs||n===Gs)if(a===at)if(i=e.get("WEBGL_compressed_texture_s3tc_srgb"),i!==null){if(n===Bs)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===ks)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===zs)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Gs)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(i=e.get("WEBGL_compressed_texture_s3tc"),i!==null){if(n===Bs)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===ks)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===zs)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Gs)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===go||n===_o||n===vo||n===xo)if(i=e.get("WEBGL_compressed_texture_pvrtc"),i!==null){if(n===go)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===_o)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===vo)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===xo)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===yo||n===So||n===Mo)if(i=e.get("WEBGL_compressed_texture_etc"),i!==null){if(n===yo||n===So)return a===at?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===Mo)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(n===bo||n===Eo||n===To||n===wo||n===Ao||n===Co||n===Ro||n===Po||n===Uo||n===Do||n===Lo||n===Io||n===Fo||n===No)if(i=e.get("WEBGL_compressed_texture_astc"),i!==null){if(n===bo)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Eo)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===To)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===wo)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Ao)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Co)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Ro)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Po)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Uo)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Do)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Lo)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Io)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Fo)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===No)return a===at?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Hs||n===Oo||n===Bo)if(i=e.get("EXT_texture_compression_bptc"),i!==null){if(n===Hs)return a===at?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Oo)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Bo)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Ru||n===ko||n===zo||n===Go)if(i=e.get("EXT_texture_compression_rgtc"),i!==null){if(n===Hs)return i.COMPRESSED_RED_RGTC1_EXT;if(n===ko)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===zo)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Go)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Ii?s.UNSIGNED_INT_24_8:s[n]!==void 0?s[n]:null}return{convert:t}}class Bg extends Yt{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}}class jr extends xt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const kg={type:"move"};class pa{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new jr,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new jr,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new V,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new V),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new jr,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new V,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new V),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(const _ of e.hand.values()){const p=t.getJointPose(_,n),m=this._getHandJoint(c,_);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.rotation,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}const h=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],u=h.position.distanceTo(f.position),d=.02,g=.005;c.inputState.pinching&&u>d+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&u<=d-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(l.matrix.fromArray(i.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,i.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(i.linearVelocity)):l.hasLinearVelocity=!1,i.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(i.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(kg)))}return o!==null&&(o.visible=r!==null),l!==null&&(l.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new jr;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}const zg=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Gg=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Hg{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,n){if(this.texture===null){const r=new Tt,i=e.properties.get(r);i.__webglTexture=t.texture,(t.depthNear!=n.depthNear||t.depthFar!=n.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new It({vertexShader:zg,fragmentShader:Gg,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Rt(new ii(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}}class Vg extends ti{constructor(e,t){super();const n=this;let r=null,i=1,a=null,o="local-floor",l=1,c=null,h=null,f=null,u=null,d=null,g=null;const _=new Hg,p=t.getContextAttributes();let m=null,M=null;const v=[],b=[],R=new Oe;let w=null;const T=new Yt;T.layers.enable(1),T.viewport=new ht;const P=new Yt;P.layers.enable(2),P.viewport=new ht;const E=[T,P],y=new Bg;y.layers.enable(1),y.layers.enable(2);let L=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(O){let B=v[O];return B===void 0&&(B=new pa,v[O]=B),B.getTargetRaySpace()},this.getControllerGrip=function(O){let B=v[O];return B===void 0&&(B=new pa,v[O]=B),B.getGripSpace()},this.getHand=function(O){let B=v[O];return B===void 0&&(B=new pa,v[O]=B),B.getHandSpace()};function I(O){const B=b.indexOf(O.inputSource);if(B===-1)return;const te=v[B];te!==void 0&&(te.update(O.inputSource,O.frame,c||a),te.dispatchEvent({type:O.type,data:O.inputSource}))}function N(){r.removeEventListener("select",I),r.removeEventListener("selectstart",I),r.removeEventListener("selectend",I),r.removeEventListener("squeeze",I),r.removeEventListener("squeezestart",I),r.removeEventListener("squeezeend",I),r.removeEventListener("end",N),r.removeEventListener("inputsourceschange",W);for(let O=0;O<v.length;O++){const B=b[O];B!==null&&(b[O]=null,v[O].disconnect(B))}L=null,U=null,_.reset(),e.setRenderTarget(m),d=null,u=null,f=null,r=null,M=null,ne.stop(),n.isPresenting=!1,e.setPixelRatio(w),e.setSize(R.width,R.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(O){i=O,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(O){o=O,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(O){c=O},this.getBaseLayer=function(){return u!==null?u:d},this.getBinding=function(){return f},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(O){if(r=O,r!==null){if(m=e.getRenderTarget(),r.addEventListener("select",I),r.addEventListener("selectstart",I),r.addEventListener("selectend",I),r.addEventListener("squeeze",I),r.addEventListener("squeezestart",I),r.addEventListener("squeezeend",I),r.addEventListener("end",N),r.addEventListener("inputsourceschange",W),p.xrCompatible!==!0&&await t.makeXRCompatible(),w=e.getPixelRatio(),e.getSize(R),r.renderState.layers===void 0){const B={antialias:p.antialias,alpha:!0,depth:p.depth,stencil:p.stencil,framebufferScaleFactor:i};d=new XRWebGLLayer(r,t,B),r.updateRenderState({baseLayer:d}),e.setPixelRatio(1),e.setSize(d.framebufferWidth,d.framebufferHeight,!1),M=new en(d.framebufferWidth,d.framebufferHeight,{format:on,type:On,colorSpace:e.outputColorSpace,stencilBuffer:p.stencil})}else{let B=null,te=null,G=null;p.depth&&(G=p.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,B=p.stencil?Fi:Ci,te=p.stencil?Ii:Li);const oe={colorFormat:t.RGBA8,depthFormat:G,scaleFactor:i};f=new XRWebGLBinding(r,t),u=f.createProjectionLayer(oe),r.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),M=new en(u.textureWidth,u.textureHeight,{format:on,type:On,depthTexture:new kc(u.textureWidth,u.textureHeight,te,void 0,void 0,void 0,void 0,void 0,void 0,B),stencilBuffer:p.stencil,colorSpace:e.outputColorSpace,samples:p.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1})}M.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await r.requestReferenceSpace(o),ne.setContext(r),ne.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode};function W(O){for(let B=0;B<O.removed.length;B++){const te=O.removed[B],G=b.indexOf(te);G>=0&&(b[G]=null,v[G].disconnect(te))}for(let B=0;B<O.added.length;B++){const te=O.added[B];let G=b.indexOf(te);if(G===-1){for(let pe=0;pe<v.length;pe++)if(pe>=b.length){b.push(te),G=pe;break}else if(b[pe]===null){b[pe]=te,G=pe;break}if(G===-1)break}const oe=v[G];oe&&oe.connect(te)}}const k=new V,se=new V;function j(O,B,te){k.setFromMatrixPosition(B.matrixWorld),se.setFromMatrixPosition(te.matrixWorld);const G=k.distanceTo(se),oe=B.projectionMatrix.elements,pe=te.projectionMatrix.elements,ve=oe[14]/(oe[10]-1),D=oe[14]/(oe[10]+1),he=(oe[9]+1)/oe[5],Pe=(oe[9]-1)/oe[5],Ue=(oe[8]-1)/oe[0],de=(pe[8]+1)/pe[0],ye=ve*Ue,Me=ve*de,fe=G/(-Ue+de),Ce=fe*-Ue;B.matrixWorld.decompose(O.position,O.quaternion,O.scale),O.translateX(Ce),O.translateZ(fe),O.matrixWorld.compose(O.position,O.quaternion,O.scale),O.matrixWorldInverse.copy(O.matrixWorld).invert();const C=ve+fe,x=D+fe,X=ye-Ce,Z=Me+(G-Ce),ie=he*D/x*C,Q=Pe*D/x*C;O.projectionMatrix.makePerspective(X,Z,ie,Q,C,x),O.projectionMatrixInverse.copy(O.projectionMatrix).invert()}function K(O,B){B===null?O.matrixWorld.copy(O.matrix):O.matrixWorld.multiplyMatrices(B.matrixWorld,O.matrix),O.matrixWorldInverse.copy(O.matrixWorld).invert()}this.updateCamera=function(O){if(r===null)return;_.texture!==null&&(O.near=_.depthNear,O.far=_.depthFar),y.near=P.near=T.near=O.near,y.far=P.far=T.far=O.far,(L!==y.near||U!==y.far)&&(r.updateRenderState({depthNear:y.near,depthFar:y.far}),L=y.near,U=y.far,T.near=L,T.far=U,P.near=L,P.far=U,T.updateProjectionMatrix(),P.updateProjectionMatrix(),O.updateProjectionMatrix());const B=O.parent,te=y.cameras;K(y,B);for(let G=0;G<te.length;G++)K(te[G],B);te.length===2?j(y,T,P):y.projectionMatrix.copy(T.projectionMatrix),q(O,y,B)};function q(O,B,te){te===null?O.matrix.copy(B.matrixWorld):(O.matrix.copy(te.matrixWorld),O.matrix.invert(),O.matrix.multiply(B.matrixWorld)),O.matrix.decompose(O.position,O.quaternion,O.scale),O.updateMatrixWorld(!0),O.projectionMatrix.copy(B.projectionMatrix),O.projectionMatrixInverse.copy(B.projectionMatrixInverse),O.isPerspectiveCamera&&(O.fov=Aa*2*Math.atan(1/O.projectionMatrix.elements[5]),O.zoom=1)}this.getCamera=function(){return y},this.getFoveation=function(){if(!(u===null&&d===null))return l},this.setFoveation=function(O){l=O,u!==null&&(u.fixedFoveation=O),d!==null&&d.fixedFoveation!==void 0&&(d.fixedFoveation=O)},this.hasDepthSensing=function(){return _.texture!==null},this.getDepthSensingMesh=function(){return _.getMesh(y)};let F=null;function H(O,B){if(h=B.getViewerPose(c||a),g=B,h!==null){const te=h.views;d!==null&&(e.setRenderTargetFramebuffer(M,d.framebuffer),e.setRenderTarget(M));let G=!1;te.length!==y.cameras.length&&(y.cameras.length=0,G=!0);for(let pe=0;pe<te.length;pe++){const ve=te[pe];let D=null;if(d!==null)D=d.getViewport(ve);else{const Pe=f.getViewSubImage(u,ve);D=Pe.viewport,pe===0&&(e.setRenderTargetTextures(M,Pe.colorTexture,u.ignoreDepthValues?void 0:Pe.depthStencilTexture),e.setRenderTarget(M))}let he=E[pe];he===void 0&&(he=new Yt,he.layers.enable(pe),he.viewport=new ht,E[pe]=he),he.matrix.fromArray(ve.transform.matrix),he.matrix.decompose(he.position,he.quaternion,he.scale),he.projectionMatrix.fromArray(ve.projectionMatrix),he.projectionMatrixInverse.copy(he.projectionMatrix).invert(),he.viewport.set(D.x,D.y,D.width,D.height),pe===0&&(y.matrix.copy(he.matrix),y.matrix.decompose(y.position,y.quaternion,y.scale)),G===!0&&y.cameras.push(he)}const oe=r.enabledFeatures;if(oe&&oe.includes("depth-sensing")){const pe=f.getDepthInformation(te[0]);pe&&pe.isValid&&pe.texture&&_.init(e,pe,r.renderState)}}for(let te=0;te<v.length;te++){const G=b[te],oe=v[te];G!==null&&oe!==void 0&&oe.update(G,B,c||a)}F&&F(O,B),B.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:B}),g=null}const ne=new Bc;ne.setAnimationLoop(H),this.setAnimationLoop=function(O){F=O},this.dispose=function(){}}}const Yn=new ln,Wg=new it;function Xg(s,e){function t(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function n(p,m){m.color.getRGB(p.fogColor.value,Fc(s)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function r(p,m,M,v,b){m.isMeshBasicMaterial||m.isMeshLambertMaterial?i(p,m):m.isMeshToonMaterial?(i(p,m),f(p,m)):m.isMeshPhongMaterial?(i(p,m),h(p,m)):m.isMeshStandardMaterial?(i(p,m),u(p,m),m.isMeshPhysicalMaterial&&d(p,m,b)):m.isMeshMatcapMaterial?(i(p,m),g(p,m)):m.isMeshDepthMaterial?i(p,m):m.isMeshDistanceMaterial?(i(p,m),_(p,m)):m.isMeshNormalMaterial?i(p,m):m.isLineBasicMaterial?(a(p,m),m.isLineDashedMaterial&&o(p,m)):m.isPointsMaterial?l(p,m,M,v):m.isSpriteMaterial?c(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function i(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,t(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===Ft&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,t(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===Ft&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,t(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,t(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);const M=e.get(m),v=M.envMap,b=M.envMapRotation;v&&(p.envMap.value=v,Yn.copy(b),Yn.x*=-1,Yn.y*=-1,Yn.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(Yn.y*=-1,Yn.z*=-1),p.envMapRotation.value.setFromMatrix4(Wg.makeRotationFromEuler(Yn)),p.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,t(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,p.aoMapTransform))}function a(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform))}function o(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function l(p,m,M,v){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*M,p.scale.value=v*.5,m.map&&(p.map.value=m.map,t(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function c(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function h(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function f(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function u(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function d(p,m,M){p.ior.value=m.ior,m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===Ft&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=m.iridescenceThicknessRange[1],m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=M.texture,p.transmissionSamplerSize.value.set(M.width,M.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,m){m.matcap&&(p.matcap.value=m.matcap)}function _(p,m){const M=e.get(m).light;p.referencePosition.value.setFromMatrixPosition(M.matrixWorld),p.nearDistance.value=M.shadow.camera.near,p.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function Yg(s,e,t,n){let r={},i={},a=[];const o=s.getParameter(s.MAX_UNIFORM_BUFFER_BINDINGS);function l(M,v){const b=v.program;n.uniformBlockBinding(M,b)}function c(M,v){let b=r[M.id];b===void 0&&(g(M),b=h(M),r[M.id]=b,M.addEventListener("dispose",p));const R=v.program;n.updateUBOMapping(M,R);const w=e.render.frame;i[M.id]!==w&&(u(M),i[M.id]=w)}function h(M){const v=f();M.__bindingPointIndex=v;const b=s.createBuffer(),R=M.__size,w=M.usage;return s.bindBuffer(s.UNIFORM_BUFFER,b),s.bufferData(s.UNIFORM_BUFFER,R,w),s.bindBuffer(s.UNIFORM_BUFFER,null),s.bindBufferBase(s.UNIFORM_BUFFER,v,b),b}function f(){for(let M=0;M<o;M++)if(a.indexOf(M)===-1)return a.push(M),M;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(M){const v=r[M.id],b=M.uniforms,R=M.__cache;s.bindBuffer(s.UNIFORM_BUFFER,v);for(let w=0,T=b.length;w<T;w++){const P=Array.isArray(b[w])?b[w]:[b[w]];for(let E=0,y=P.length;E<y;E++){const L=P[E];if(d(L,w,E,R)===!0){const U=L.__offset,I=Array.isArray(L.value)?L.value:[L.value];let N=0;for(let W=0;W<I.length;W++){const k=I[W],se=_(k);typeof k=="number"||typeof k=="boolean"?(L.__data[0]=k,s.bufferSubData(s.UNIFORM_BUFFER,U+N,L.__data)):k.isMatrix3?(L.__data[0]=k.elements[0],L.__data[1]=k.elements[1],L.__data[2]=k.elements[2],L.__data[3]=0,L.__data[4]=k.elements[3],L.__data[5]=k.elements[4],L.__data[6]=k.elements[5],L.__data[7]=0,L.__data[8]=k.elements[6],L.__data[9]=k.elements[7],L.__data[10]=k.elements[8],L.__data[11]=0):(k.toArray(L.__data,N),N+=se.storage/Float32Array.BYTES_PER_ELEMENT)}s.bufferSubData(s.UNIFORM_BUFFER,U,L.__data)}}}s.bindBuffer(s.UNIFORM_BUFFER,null)}function d(M,v,b,R){const w=M.value,T=v+"_"+b;if(R[T]===void 0)return typeof w=="number"||typeof w=="boolean"?R[T]=w:R[T]=w.clone(),!0;{const P=R[T];if(typeof w=="number"||typeof w=="boolean"){if(P!==w)return R[T]=w,!0}else if(P.equals(w)===!1)return P.copy(w),!0}return!1}function g(M){const v=M.uniforms;let b=0;const R=16;for(let T=0,P=v.length;T<P;T++){const E=Array.isArray(v[T])?v[T]:[v[T]];for(let y=0,L=E.length;y<L;y++){const U=E[y],I=Array.isArray(U.value)?U.value:[U.value];for(let N=0,W=I.length;N<W;N++){const k=I[N],se=_(k),j=b%R;j!==0&&R-j<se.boundary&&(b+=R-j),U.__data=new Float32Array(se.storage/Float32Array.BYTES_PER_ELEMENT),U.__offset=b,b+=se.storage}}}const w=b%R;return w>0&&(b+=R-w),M.__size=b,M.__cache={},this}function _(M){const v={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(v.boundary=4,v.storage=4):M.isVector2?(v.boundary=8,v.storage=8):M.isVector3||M.isColor?(v.boundary=16,v.storage=12):M.isVector4?(v.boundary=16,v.storage=16):M.isMatrix3?(v.boundary=48,v.storage=48):M.isMatrix4?(v.boundary=64,v.storage=64):M.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",M),v}function p(M){const v=M.target;v.removeEventListener("dispose",p);const b=a.indexOf(v.__bindingPointIndex);a.splice(b,1),s.deleteBuffer(r[v.id]),delete r[v.id],delete i[v.id]}function m(){for(const M in r)s.deleteBuffer(r[M]);a=[],r={},i={}}return{bind:l,update:c,dispose:m}}class jg{constructor(e={}){const{canvas:t=Gu(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:f=!1}=e;this.isWebGLRenderer=!0;let u;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");u=n.getContextAttributes().alpha}else u=a;const d=new Uint32Array(4),g=new Int32Array(4);let _=null,p=null;const m=[],M=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=nn,this.toneMapping=In,this.toneMappingExposure=1;const v=this;let b=!1,R=0,w=0,T=null,P=-1,E=null;const y=new ht,L=new ht;let U=null;const I=new Ye(0);let N=0,W=t.width,k=t.height,se=1,j=null,K=null;const q=new ht(0,0,W,k),F=new ht(0,0,W,k);let H=!1;const ne=new Ha;let O=!1,B=!1;const te=new it,G=new V,oe={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let pe=!1;function ve(){return T===null?se:1}let D=n;function he(A,Y){return t.getContext(A,Y)}try{const A={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${ka}`),t.addEventListener("webglcontextlost",$,!1),t.addEventListener("webglcontextrestored",z,!1),t.addEventListener("webglcontextcreationerror",ee,!1),D===null){const Y="webgl2";if(D=he(Y,A),D===null)throw he(Y)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(A){throw console.error("THREE.WebGLRenderer: "+A.message),A}let Pe,Ue,de,ye,Me,fe,Ce,C,x,X,Z,ie,Q,Te,le,ce,Se,ue,be,Be,we,me,xe,Ne;function Ve(){Pe=new im(D),Pe.init(),me=new Og(D,Pe),Ue=new Jp(D,Pe,e,me),de=new Fg(D),ye=new am(D),Me=new bg,fe=new Ng(D,Pe,de,Me,Ue,me,ye),Ce=new $p(v),C=new nm(v),x=new df(D),xe=new Kp(D,x),X=new rm(D,x,ye,xe),Z=new lm(D,X,x,ye),be=new om(D,Ue,fe),ce=new Qp(Me),ie=new Mg(v,Ce,C,Pe,Ue,xe,ce),Q=new Xg(v,Me),Te=new Tg,le=new Ug(Pe),ue=new qp(v,Ce,C,de,Z,u,l),Se=new Ig(v,Z,Ue),Ne=new Yg(D,ye,Ue,de),Be=new Zp(D,Pe,ye),we=new sm(D,Pe,ye),ye.programs=ie.programs,v.capabilities=Ue,v.extensions=Pe,v.properties=Me,v.renderLists=Te,v.shadowMap=Se,v.state=de,v.info=ye}Ve();const S=new Vg(v,D);this.xr=S,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const A=Pe.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){const A=Pe.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return se},this.setPixelRatio=function(A){A!==void 0&&(se=A,this.setSize(W,k,!1))},this.getSize=function(A){return A.set(W,k)},this.setSize=function(A,Y,re=!0){if(S.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}W=A,k=Y,t.width=Math.floor(A*se),t.height=Math.floor(Y*se),re===!0&&(t.style.width=A+"px",t.style.height=Y+"px"),this.setViewport(0,0,A,Y)},this.getDrawingBufferSize=function(A){return A.set(W*se,k*se).floor()},this.setDrawingBufferSize=function(A,Y,re){W=A,k=Y,se=re,t.width=Math.floor(A*re),t.height=Math.floor(Y*re),this.setViewport(0,0,A,Y)},this.getCurrentViewport=function(A){return A.copy(y)},this.getViewport=function(A){return A.copy(q)},this.setViewport=function(A,Y,re,ae){A.isVector4?q.set(A.x,A.y,A.z,A.w):q.set(A,Y,re,ae),de.viewport(y.copy(q).multiplyScalar(se).round())},this.getScissor=function(A){return A.copy(F)},this.setScissor=function(A,Y,re,ae){A.isVector4?F.set(A.x,A.y,A.z,A.w):F.set(A,Y,re,ae),de.scissor(L.copy(F).multiplyScalar(se).round())},this.getScissorTest=function(){return H},this.setScissorTest=function(A){de.setScissorTest(H=A)},this.setOpaqueSort=function(A){j=A},this.setTransparentSort=function(A){K=A},this.getClearColor=function(A){return A.copy(ue.getClearColor())},this.setClearColor=function(){ue.setClearColor.apply(ue,arguments)},this.getClearAlpha=function(){return ue.getClearAlpha()},this.setClearAlpha=function(){ue.setClearAlpha.apply(ue,arguments)},this.clear=function(A=!0,Y=!0,re=!0){let ae=0;if(A){let J=!1;if(T!==null){const Ee=T.texture.format;J=Ee===Ec||Ee===bc||Ee===Mc}if(J){const Ee=T.texture.type,Ie=Ee===On||Ee===Li||Ee===hs||Ee===Ii||Ee===xc||Ee===yc,Fe=ue.getClearColor(),ke=ue.getClearAlpha(),_e=Fe.r,Ge=Fe.g,He=Fe.b;Ie?(d[0]=_e,d[1]=Ge,d[2]=He,d[3]=ke,D.clearBufferuiv(D.COLOR,0,d)):(g[0]=_e,g[1]=Ge,g[2]=He,g[3]=ke,D.clearBufferiv(D.COLOR,0,g))}else ae|=D.COLOR_BUFFER_BIT}Y&&(ae|=D.DEPTH_BUFFER_BIT),re&&(ae|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(ae)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",$,!1),t.removeEventListener("webglcontextrestored",z,!1),t.removeEventListener("webglcontextcreationerror",ee,!1),Te.dispose(),le.dispose(),Me.dispose(),Ce.dispose(),C.dispose(),Z.dispose(),xe.dispose(),Ne.dispose(),ie.dispose(),S.dispose(),S.removeEventListener("sessionstart",Xe),S.removeEventListener("sessionend",Je),tt.stop()};function $(A){A.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),b=!0}function z(){console.log("THREE.WebGLRenderer: Context Restored."),b=!1;const A=ye.autoReset,Y=Se.enabled,re=Se.autoUpdate,ae=Se.needsUpdate,J=Se.type;Ve(),ye.autoReset=A,Se.enabled=Y,Se.autoUpdate=re,Se.needsUpdate=ae,Se.type=J}function ee(A){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function ge(A){const Y=A.target;Y.removeEventListener("dispose",ge),Ae(Y)}function Ae(A){Re(A),Me.remove(A)}function Re(A){const Y=Me.get(A).programs;Y!==void 0&&(Y.forEach(function(re){ie.releaseProgram(re)}),A.isShaderMaterial&&ie.releaseShaderCache(A))}this.renderBufferDirect=function(A,Y,re,ae,J,Ee){Y===null&&(Y=oe);const Ie=J.isMesh&&J.matrixWorld.determinant()<0,Fe=cn(A,Y,re,ae,J);de.setMaterial(ae,Ie);let ke=re.index,_e=1;if(ae.wireframe===!0){if(ke=X.getWireframeAttribute(re),ke===void 0)return;_e=2}const Ge=re.drawRange,He=re.attributes.position;let Ze=Ge.start*_e,rt=(Ge.start+Ge.count)*_e;Ee!==null&&(Ze=Math.max(Ze,Ee.start*_e),rt=Math.min(rt,(Ee.start+Ee.count)*_e)),ke!==null?(Ze=Math.max(Ze,0),rt=Math.min(rt,ke.count)):He!=null&&(Ze=Math.max(Ze,0),rt=Math.min(rt,He.count));const st=rt-Ze;if(st<0||st===1/0)return;xe.setup(J,ae,Fe,re,ke);let _t,Qe=Be;if(ke!==null&&(_t=x.get(ke),Qe=we,Qe.setIndex(_t)),J.isMesh)ae.wireframe===!0?(de.setLineWidth(ae.wireframeLinewidth*ve()),Qe.setMode(D.LINES)):Qe.setMode(D.TRIANGLES);else if(J.isLine){let ze=ae.linewidth;ze===void 0&&(ze=1),de.setLineWidth(ze*ve()),J.isLineSegments?Qe.setMode(D.LINES):J.isLineLoop?Qe.setMode(D.LINE_LOOP):Qe.setMode(D.LINE_STRIP)}else J.isPoints?Qe.setMode(D.POINTS):J.isSprite&&Qe.setMode(D.TRIANGLES);if(J.isBatchedMesh)J._multiDrawInstances!==null?Qe.renderMultiDrawInstances(J._multiDrawStarts,J._multiDrawCounts,J._multiDrawCount,J._multiDrawInstances):Qe.renderMultiDraw(J._multiDrawStarts,J._multiDrawCounts,J._multiDrawCount);else if(J.isInstancedMesh)Qe.renderInstances(Ze,st,J.count);else if(re.isInstancedBufferGeometry){const ze=re._maxInstanceCount!==void 0?re._maxInstanceCount:1/0,pt=Math.min(re.instanceCount,ze);Qe.renderInstances(Ze,st,pt)}else Qe.render(Ze,st)};function je(A,Y,re){A.transparent===!0&&A.side===sn&&A.forceSinglePass===!1?(A.side=Ft,A.needsUpdate=!0,Gt(A,Y,re),A.side=Nn,A.needsUpdate=!0,Gt(A,Y,re),A.side=sn):Gt(A,Y,re)}this.compile=function(A,Y,re=null){re===null&&(re=A),p=le.get(re),p.init(Y),M.push(p),re.traverseVisible(function(J){J.isLight&&J.layers.test(Y.layers)&&(p.pushLight(J),J.castShadow&&p.pushShadow(J))}),A!==re&&A.traverseVisible(function(J){J.isLight&&J.layers.test(Y.layers)&&(p.pushLight(J),J.castShadow&&p.pushShadow(J))}),p.setupLights();const ae=new Set;return A.traverse(function(J){const Ee=J.material;if(Ee)if(Array.isArray(Ee))for(let Ie=0;Ie<Ee.length;Ie++){const Fe=Ee[Ie];je(Fe,re,J),ae.add(Fe)}else je(Ee,re,J),ae.add(Ee)}),M.pop(),p=null,ae},this.compileAsync=function(A,Y,re=null){const ae=this.compile(A,Y,re);return new Promise(J=>{function Ee(){if(ae.forEach(function(Ie){Me.get(Ie).currentProgram.isReady()&&ae.delete(Ie)}),ae.size===0){J(A);return}setTimeout(Ee,10)}Pe.get("KHR_parallel_shader_compile")!==null?Ee():setTimeout(Ee,10)})};let We=null;function Le(A){We&&We(A)}function Xe(){tt.stop()}function Je(){tt.start()}const tt=new Bc;tt.setAnimationLoop(Le),typeof self<"u"&&tt.setContext(self),this.setAnimationLoop=function(A){We=A,S.setAnimationLoop(A),A===null?tt.stop():tt.start()},S.addEventListener("sessionstart",Xe),S.addEventListener("sessionend",Je),this.render=function(A,Y){if(Y!==void 0&&Y.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(b===!0)return;if(A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),Y.parent===null&&Y.matrixWorldAutoUpdate===!0&&Y.updateMatrixWorld(),S.enabled===!0&&S.isPresenting===!0&&(S.cameraAutoUpdate===!0&&S.updateCamera(Y),Y=S.getCamera()),A.isScene===!0&&A.onBeforeRender(v,A,Y,T),p=le.get(A,M.length),p.init(Y),M.push(p),te.multiplyMatrices(Y.projectionMatrix,Y.matrixWorldInverse),ne.setFromProjectionMatrix(te),B=this.localClippingEnabled,O=ce.init(this.clippingPlanes,B),_=Te.get(A,m.length),_.init(),m.push(_),S.enabled===!0&&S.isPresenting===!0){const Ee=v.xr.getDepthSensingMesh();Ee!==null&&$e(Ee,Y,-1/0,v.sortObjects)}$e(A,Y,0,v.sortObjects),_.finish(),v.sortObjects===!0&&_.sort(j,K),pe=S.enabled===!1||S.isPresenting===!1||S.hasDepthSensing()===!1,pe&&ue.addToRenderList(_,A),this.info.render.frame++,O===!0&&ce.beginShadows();const re=p.state.shadowsArray;Se.render(re,A,Y),O===!0&&ce.endShadows(),this.info.autoReset===!0&&this.info.reset();const ae=_.opaque,J=_.transmissive;if(p.setupLights(),Y.isArrayCamera){const Ee=Y.cameras;if(J.length>0)for(let Ie=0,Fe=Ee.length;Ie<Fe;Ie++){const ke=Ee[Ie];St(ae,J,A,ke)}pe&&ue.render(A);for(let Ie=0,Fe=Ee.length;Ie<Fe;Ie++){const ke=Ee[Ie];lt(_,A,ke,ke.viewport)}}else J.length>0&&St(ae,J,A,Y),pe&&ue.render(A),lt(_,A,Y);T!==null&&(fe.updateMultisampleRenderTarget(T),fe.updateRenderTargetMipmap(T)),A.isScene===!0&&A.onAfterRender(v,A,Y),xe.resetDefaultState(),P=-1,E=null,M.pop(),M.length>0?(p=M[M.length-1],O===!0&&ce.setGlobalState(v.clippingPlanes,p.state.camera)):p=null,m.pop(),m.length>0?_=m[m.length-1]:_=null};function $e(A,Y,re,ae){if(A.visible===!1)return;if(A.layers.test(Y.layers)){if(A.isGroup)re=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(Y);else if(A.isLight)p.pushLight(A),A.castShadow&&p.pushShadow(A);else if(A.isSprite){if(!A.frustumCulled||ne.intersectsSprite(A)){ae&&G.setFromMatrixPosition(A.matrixWorld).applyMatrix4(te);const Ie=Z.update(A),Fe=A.material;Fe.visible&&_.push(A,Ie,Fe,re,G.z,null)}}else if((A.isMesh||A.isLine||A.isPoints)&&(!A.frustumCulled||ne.intersectsObject(A))){const Ie=Z.update(A),Fe=A.material;if(ae&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),G.copy(A.boundingSphere.center)):(Ie.boundingSphere===null&&Ie.computeBoundingSphere(),G.copy(Ie.boundingSphere.center)),G.applyMatrix4(A.matrixWorld).applyMatrix4(te)),Array.isArray(Fe)){const ke=Ie.groups;for(let _e=0,Ge=ke.length;_e<Ge;_e++){const He=ke[_e],Ze=Fe[He.materialIndex];Ze&&Ze.visible&&_.push(A,Ie,Ze,re,G.z,He)}}else Fe.visible&&_.push(A,Ie,Fe,re,G.z,null)}}const Ee=A.children;for(let Ie=0,Fe=Ee.length;Ie<Fe;Ie++)$e(Ee[Ie],Y,re,ae)}function lt(A,Y,re,ae){const J=A.opaque,Ee=A.transmissive,Ie=A.transparent;p.setupLightsView(re),O===!0&&ce.setGlobalState(v.clippingPlanes,re),ae&&de.viewport(y.copy(ae)),J.length>0&&gt(J,Y,re),Ee.length>0&&gt(Ee,Y,re),Ie.length>0&&gt(Ie,Y,re),de.buffers.depth.setTest(!0),de.buffers.depth.setMask(!0),de.buffers.color.setMask(!0),de.setPolygonOffset(!1)}function St(A,Y,re,ae){if((re.isScene===!0?re.overrideMaterial:null)!==null)return;p.state.transmissionRenderTarget[ae.id]===void 0&&(p.state.transmissionRenderTarget[ae.id]=new en(1,1,{generateMipmaps:!0,type:Pe.has("EXT_color_buffer_half_float")||Pe.has("EXT_color_buffer_float")?Fn:On,minFilter:Qn,samples:4,stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:nt.workingColorSpace}));const Ee=p.state.transmissionRenderTarget[ae.id],Ie=ae.viewport||y;Ee.setSize(Ie.z,Ie.w);const Fe=v.getRenderTarget();v.setRenderTarget(Ee),v.getClearColor(I),N=v.getClearAlpha(),N<1&&v.setClearColor(16777215,.5),pe?ue.render(re):v.clear();const ke=v.toneMapping;v.toneMapping=In;const _e=ae.viewport;if(ae.viewport!==void 0&&(ae.viewport=void 0),p.setupLightsView(ae),O===!0&&ce.setGlobalState(v.clippingPlanes,ae),gt(A,re,ae),fe.updateMultisampleRenderTarget(Ee),fe.updateRenderTargetMipmap(Ee),Pe.has("WEBGL_multisampled_render_to_texture")===!1){let Ge=!1;for(let He=0,Ze=Y.length;He<Ze;He++){const rt=Y[He],st=rt.object,_t=rt.geometry,Qe=rt.material,ze=rt.group;if(Qe.side===sn&&st.layers.test(ae.layers)){const pt=Qe.side;Qe.side=Ft,Qe.needsUpdate=!0,qt(st,re,ae,_t,Qe,ze),Qe.side=pt,Qe.needsUpdate=!0,Ge=!0}}Ge===!0&&(fe.updateMultisampleRenderTarget(Ee),fe.updateRenderTargetMipmap(Ee))}v.setRenderTarget(Fe),v.setClearColor(I,N),_e!==void 0&&(ae.viewport=_e),v.toneMapping=ke}function gt(A,Y,re){const ae=Y.isScene===!0?Y.overrideMaterial:null;for(let J=0,Ee=A.length;J<Ee;J++){const Ie=A[J],Fe=Ie.object,ke=Ie.geometry,_e=ae===null?Ie.material:ae,Ge=Ie.group;Fe.layers.test(re.layers)&&qt(Fe,Y,re,ke,_e,Ge)}}function qt(A,Y,re,ae,J,Ee){A.onBeforeRender(v,Y,re,ae,J,Ee),A.modelViewMatrix.multiplyMatrices(re.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),J.onBeforeRender(v,Y,re,ae,A,Ee),J.transparent===!0&&J.side===sn&&J.forceSinglePass===!1?(J.side=Ft,J.needsUpdate=!0,v.renderBufferDirect(re,Y,ae,J,A,Ee),J.side=Nn,J.needsUpdate=!0,v.renderBufferDirect(re,Y,ae,J,A,Ee),J.side=sn):v.renderBufferDirect(re,Y,ae,J,A,Ee),A.onAfterRender(v,Y,re,ae,J,Ee)}function Gt(A,Y,re){Y.isScene!==!0&&(Y=oe);const ae=Me.get(A),J=p.state.lights,Ee=p.state.shadowsArray,Ie=J.state.version,Fe=ie.getParameters(A,J.state,Ee,Y,re),ke=ie.getProgramCacheKey(Fe);let _e=ae.programs;ae.environment=A.isMeshStandardMaterial?Y.environment:null,ae.fog=Y.fog,ae.envMap=(A.isMeshStandardMaterial?C:Ce).get(A.envMap||ae.environment),ae.envMapRotation=ae.environment!==null&&A.envMap===null?Y.environmentRotation:A.envMapRotation,_e===void 0&&(A.addEventListener("dispose",ge),_e=new Map,ae.programs=_e);let Ge=_e.get(ke);if(Ge!==void 0){if(ae.currentProgram===Ge&&ae.lightsStateVersion===Ie)return dt(A,Fe),Ge}else Fe.uniforms=ie.getUniforms(A),A.onBuild(re,Fe,v),A.onBeforeCompile(Fe,v),Ge=ie.acquireProgram(Fe,ke),_e.set(ke,Ge),ae.uniforms=Fe.uniforms;const He=ae.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(He.clippingPlanes=ce.uniform),dt(A,Fe),ae.needsLights=Hi(A),ae.lightsStateVersion=Ie,ae.needsLights&&(He.ambientLightColor.value=J.state.ambient,He.lightProbe.value=J.state.probe,He.directionalLights.value=J.state.directional,He.directionalLightShadows.value=J.state.directionalShadow,He.spotLights.value=J.state.spot,He.spotLightShadows.value=J.state.spotShadow,He.rectAreaLights.value=J.state.rectArea,He.ltc_1.value=J.state.rectAreaLTC1,He.ltc_2.value=J.state.rectAreaLTC2,He.pointLights.value=J.state.point,He.pointLightShadows.value=J.state.pointShadow,He.hemisphereLights.value=J.state.hemi,He.directionalShadowMap.value=J.state.directionalShadowMap,He.directionalShadowMatrix.value=J.state.directionalShadowMatrix,He.spotShadowMap.value=J.state.spotShadowMap,He.spotLightMatrix.value=J.state.spotLightMatrix,He.spotLightMap.value=J.state.spotLightMap,He.pointShadowMap.value=J.state.pointShadowMap,He.pointShadowMatrix.value=J.state.pointShadowMatrix),ae.currentProgram=Ge,ae.uniformsList=null,Ge}function Ht(A){if(A.uniformsList===null){const Y=A.currentProgram.getUniforms();A.uniformsList=rs.seqWithValue(Y.seq,A.uniforms)}return A.uniformsList}function dt(A,Y){const re=Me.get(A);re.outputColorSpace=Y.outputColorSpace,re.batching=Y.batching,re.batchingColor=Y.batchingColor,re.instancing=Y.instancing,re.instancingColor=Y.instancingColor,re.instancingMorph=Y.instancingMorph,re.skinning=Y.skinning,re.morphTargets=Y.morphTargets,re.morphNormals=Y.morphNormals,re.morphColors=Y.morphColors,re.morphTargetsCount=Y.morphTargetsCount,re.numClippingPlanes=Y.numClippingPlanes,re.numIntersection=Y.numClipIntersection,re.vertexAlphas=Y.vertexAlphas,re.vertexTangents=Y.vertexTangents,re.toneMapping=Y.toneMapping}function cn(A,Y,re,ae,J){Y.isScene!==!0&&(Y=oe),fe.resetTextureUnits();const Ee=Y.fog,Ie=ae.isMeshStandardMaterial?Y.environment:null,Fe=T===null?v.outputColorSpace:T.isXRRenderTarget===!0?T.texture.colorSpace:Bn,ke=(ae.isMeshStandardMaterial?C:Ce).get(ae.envMap||Ie),_e=ae.vertexColors===!0&&!!re.attributes.color&&re.attributes.color.itemSize===4,Ge=!!re.attributes.tangent&&(!!ae.normalMap||ae.anisotropy>0),He=!!re.morphAttributes.position,Ze=!!re.morphAttributes.normal,rt=!!re.morphAttributes.color;let st=In;ae.toneMapped&&(T===null||T.isXRRenderTarget===!0)&&(st=v.toneMapping);const _t=re.morphAttributes.position||re.morphAttributes.normal||re.morphAttributes.color,Qe=_t!==void 0?_t.length:0,ze=Me.get(ae),pt=p.state.lights;if(O===!0&&(B===!0||A!==E)){const Mt=A===E&&ae.id===P;ce.setState(ae,A,Mt)}let et=!1;ae.version===ze.__version?(ze.needsLights&&ze.lightsStateVersion!==pt.state.version||ze.outputColorSpace!==Fe||J.isBatchedMesh&&ze.batching===!1||!J.isBatchedMesh&&ze.batching===!0||J.isBatchedMesh&&ze.batchingColor===!0&&J.colorTexture===null||J.isBatchedMesh&&ze.batchingColor===!1&&J.colorTexture!==null||J.isInstancedMesh&&ze.instancing===!1||!J.isInstancedMesh&&ze.instancing===!0||J.isSkinnedMesh&&ze.skinning===!1||!J.isSkinnedMesh&&ze.skinning===!0||J.isInstancedMesh&&ze.instancingColor===!0&&J.instanceColor===null||J.isInstancedMesh&&ze.instancingColor===!1&&J.instanceColor!==null||J.isInstancedMesh&&ze.instancingMorph===!0&&J.morphTexture===null||J.isInstancedMesh&&ze.instancingMorph===!1&&J.morphTexture!==null||ze.envMap!==ke||ae.fog===!0&&ze.fog!==Ee||ze.numClippingPlanes!==void 0&&(ze.numClippingPlanes!==ce.numPlanes||ze.numIntersection!==ce.numIntersection)||ze.vertexAlphas!==_e||ze.vertexTangents!==Ge||ze.morphTargets!==He||ze.morphNormals!==Ze||ze.morphColors!==rt||ze.toneMapping!==st||ze.morphTargetsCount!==Qe)&&(et=!0):(et=!0,ze.__version=ae.version);let Vt=ze.currentProgram;et===!0&&(Vt=Gt(ae,Y,J));let Mn=!1,tn=!1,hn=!1;const ot=Vt.getUniforms(),wt=ze.uniforms;if(de.useProgram(Vt.program)&&(Mn=!0,tn=!0,hn=!0),ae.id!==P&&(P=ae.id,tn=!0),Mn||E!==A){ot.setValue(D,"projectionMatrix",A.projectionMatrix),ot.setValue(D,"viewMatrix",A.matrixWorldInverse);const Mt=ot.map.cameraPosition;Mt!==void 0&&Mt.setValue(D,G.setFromMatrixPosition(A.matrixWorld)),Ue.logarithmicDepthBuffer&&ot.setValue(D,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(ae.isMeshPhongMaterial||ae.isMeshToonMaterial||ae.isMeshLambertMaterial||ae.isMeshBasicMaterial||ae.isMeshStandardMaterial||ae.isShaderMaterial)&&ot.setValue(D,"isOrthographic",A.isOrthographicCamera===!0),E!==A&&(E=A,tn=!0,hn=!0)}if(J.isSkinnedMesh){ot.setOptional(D,J,"bindMatrix"),ot.setOptional(D,J,"bindMatrixInverse");const Mt=J.skeleton;Mt&&(Mt.boneTexture===null&&Mt.computeBoneTexture(),ot.setValue(D,"boneTexture",Mt.boneTexture,fe))}J.isBatchedMesh&&(ot.setOptional(D,J,"batchingTexture"),ot.setValue(D,"batchingTexture",J._matricesTexture,fe),ot.setOptional(D,J,"batchingColorTexture"),J._colorsTexture!==null&&ot.setValue(D,"batchingColorTexture",J._colorsTexture,fe));const kn=re.morphAttributes;if((kn.position!==void 0||kn.normal!==void 0||kn.color!==void 0)&&be.update(J,re,Vt),(tn||ze.receiveShadow!==J.receiveShadow)&&(ze.receiveShadow=J.receiveShadow,ot.setValue(D,"receiveShadow",J.receiveShadow)),ae.isMeshGouraudMaterial&&ae.envMap!==null&&(wt.envMap.value=ke,wt.flipEnvMap.value=ke.isCubeTexture&&ke.isRenderTargetTexture===!1?-1:1),ae.isMeshStandardMaterial&&ae.envMap===null&&Y.environment!==null&&(wt.envMapIntensity.value=Y.environmentIntensity),tn&&(ot.setValue(D,"toneMappingExposure",v.toneMappingExposure),ze.needsLights&&gr(wt,hn),Ee&&ae.fog===!0&&Q.refreshFogUniforms(wt,Ee),Q.refreshMaterialUniforms(wt,ae,se,k,p.state.transmissionRenderTarget[A.id]),rs.upload(D,Ht(ze),wt,fe)),ae.isShaderMaterial&&ae.uniformsNeedUpdate===!0&&(rs.upload(D,Ht(ze),wt,fe),ae.uniformsNeedUpdate=!1),ae.isSpriteMaterial&&ot.setValue(D,"center",J.center),ot.setValue(D,"modelViewMatrix",J.modelViewMatrix),ot.setValue(D,"normalMatrix",J.normalMatrix),ot.setValue(D,"modelMatrix",J.matrixWorld),ae.isShaderMaterial||ae.isRawShaderMaterial){const Mt=ae.uniformsGroups;for(let zn=0,Wt=Mt.length;zn<Wt;zn++){const _r=Mt[zn];Ne.update(_r,Vt),Ne.bind(_r,Vt)}}return Vt}function gr(A,Y){A.ambientLightColor.needsUpdate=Y,A.lightProbe.needsUpdate=Y,A.directionalLights.needsUpdate=Y,A.directionalLightShadows.needsUpdate=Y,A.pointLights.needsUpdate=Y,A.pointLightShadows.needsUpdate=Y,A.spotLights.needsUpdate=Y,A.spotLightShadows.needsUpdate=Y,A.rectAreaLights.needsUpdate=Y,A.hemisphereLights.needsUpdate=Y}function Hi(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return R},this.getActiveMipmapLevel=function(){return w},this.getRenderTarget=function(){return T},this.setRenderTargetTextures=function(A,Y,re){Me.get(A.texture).__webglTexture=Y,Me.get(A.depthTexture).__webglTexture=re;const ae=Me.get(A);ae.__hasExternalTextures=!0,ae.__autoAllocateDepthBuffer=re===void 0,ae.__autoAllocateDepthBuffer||Pe.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),ae.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(A,Y){const re=Me.get(A);re.__webglFramebuffer=Y,re.__useDefaultFramebuffer=Y===void 0},this.setRenderTarget=function(A,Y=0,re=0){T=A,R=Y,w=re;let ae=!0,J=null,Ee=!1,Ie=!1;if(A){const ke=Me.get(A);ke.__useDefaultFramebuffer!==void 0?(de.bindFramebuffer(D.FRAMEBUFFER,null),ae=!1):ke.__webglFramebuffer===void 0?fe.setupRenderTarget(A):ke.__hasExternalTextures&&fe.rebindTextures(A,Me.get(A.texture).__webglTexture,Me.get(A.depthTexture).__webglTexture);const _e=A.texture;(_e.isData3DTexture||_e.isDataArrayTexture||_e.isCompressedArrayTexture)&&(Ie=!0);const Ge=Me.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(Ge[Y])?J=Ge[Y][re]:J=Ge[Y],Ee=!0):A.samples>0&&fe.useMultisampledRTT(A)===!1?J=Me.get(A).__webglMultisampledFramebuffer:Array.isArray(Ge)?J=Ge[re]:J=Ge,y.copy(A.viewport),L.copy(A.scissor),U=A.scissorTest}else y.copy(q).multiplyScalar(se).floor(),L.copy(F).multiplyScalar(se).floor(),U=H;if(de.bindFramebuffer(D.FRAMEBUFFER,J)&&ae&&de.drawBuffers(A,J),de.viewport(y),de.scissor(L),de.setScissorTest(U),Ee){const ke=Me.get(A.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+Y,ke.__webglTexture,re)}else if(Ie){const ke=Me.get(A.texture),_e=Y||0;D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,ke.__webglTexture,re||0,_e)}P=-1},this.readRenderTargetPixels=function(A,Y,re,ae,J,Ee,Ie){if(!(A&&A.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Fe=Me.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&Ie!==void 0&&(Fe=Fe[Ie]),Fe){de.bindFramebuffer(D.FRAMEBUFFER,Fe);try{const ke=A.texture,_e=ke.format,Ge=ke.type;if(!Ue.textureFormatReadable(_e)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ue.textureTypeReadable(Ge)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}Y>=0&&Y<=A.width-ae&&re>=0&&re<=A.height-J&&D.readPixels(Y,re,ae,J,me.convert(_e),me.convert(Ge),Ee)}finally{const ke=T!==null?Me.get(T).__webglFramebuffer:null;de.bindFramebuffer(D.FRAMEBUFFER,ke)}}},this.readRenderTargetPixelsAsync=async function(A,Y,re,ae,J,Ee,Ie){if(!(A&&A.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Fe=Me.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&Ie!==void 0&&(Fe=Fe[Ie]),Fe){de.bindFramebuffer(D.FRAMEBUFFER,Fe);try{const ke=A.texture,_e=ke.format,Ge=ke.type;if(!Ue.textureFormatReadable(_e))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ue.textureTypeReadable(Ge))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(Y>=0&&Y<=A.width-ae&&re>=0&&re<=A.height-J){const He=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,He),D.bufferData(D.PIXEL_PACK_BUFFER,Ee.byteLength,D.STREAM_READ),D.readPixels(Y,re,ae,J,me.convert(_e),me.convert(Ge),0),D.flush();const Ze=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);await Hu(D,Ze,4);try{D.bindBuffer(D.PIXEL_PACK_BUFFER,He),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,Ee)}finally{D.deleteBuffer(He),D.deleteSync(Ze)}return Ee}}finally{const ke=T!==null?Me.get(T).__webglFramebuffer:null;de.bindFramebuffer(D.FRAMEBUFFER,ke)}}},this.copyFramebufferToTexture=function(A,Y=null,re=0){A.isTexture!==!0&&(console.warn("WebGLRenderer: copyFramebufferToTexture function signature has changed."),Y=arguments[0]||null,A=arguments[1]);const ae=Math.pow(2,-re),J=Math.floor(A.image.width*ae),Ee=Math.floor(A.image.height*ae),Ie=Y!==null?Y.x:0,Fe=Y!==null?Y.y:0;fe.setTexture2D(A,0),D.copyTexSubImage2D(D.TEXTURE_2D,re,0,0,Ie,Fe,J,Ee),de.unbindTexture()},this.copyTextureToTexture=function(A,Y,re=null,ae=null,J=0){A.isTexture!==!0&&(console.warn("WebGLRenderer: copyTextureToTexture function signature has changed."),ae=arguments[0]||null,A=arguments[1],Y=arguments[2],J=arguments[3]||0,re=null);let Ee,Ie,Fe,ke,_e,Ge;re!==null?(Ee=re.max.x-re.min.x,Ie=re.max.y-re.min.y,Fe=re.min.x,ke=re.min.y):(Ee=A.image.width,Ie=A.image.height,Fe=0,ke=0),ae!==null?(_e=ae.x,Ge=ae.y):(_e=0,Ge=0);const He=me.convert(Y.format),Ze=me.convert(Y.type);fe.setTexture2D(Y,0),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,Y.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Y.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,Y.unpackAlignment);const rt=D.getParameter(D.UNPACK_ROW_LENGTH),st=D.getParameter(D.UNPACK_IMAGE_HEIGHT),_t=D.getParameter(D.UNPACK_SKIP_PIXELS),Qe=D.getParameter(D.UNPACK_SKIP_ROWS),ze=D.getParameter(D.UNPACK_SKIP_IMAGES),pt=A.isCompressedTexture?A.mipmaps[J]:A.image;D.pixelStorei(D.UNPACK_ROW_LENGTH,pt.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,pt.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Fe),D.pixelStorei(D.UNPACK_SKIP_ROWS,ke),A.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,J,_e,Ge,Ee,Ie,He,Ze,pt.data):A.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,J,_e,Ge,pt.width,pt.height,He,pt.data):D.texSubImage2D(D.TEXTURE_2D,J,_e,Ge,He,Ze,pt),D.pixelStorei(D.UNPACK_ROW_LENGTH,rt),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,st),D.pixelStorei(D.UNPACK_SKIP_PIXELS,_t),D.pixelStorei(D.UNPACK_SKIP_ROWS,Qe),D.pixelStorei(D.UNPACK_SKIP_IMAGES,ze),J===0&&Y.generateMipmaps&&D.generateMipmap(D.TEXTURE_2D),de.unbindTexture()},this.copyTextureToTexture3D=function(A,Y,re=null,ae=null,J=0){A.isTexture!==!0&&(console.warn("WebGLRenderer: copyTextureToTexture3D function signature has changed."),re=arguments[0]||null,ae=arguments[1]||null,A=arguments[2],Y=arguments[3],J=arguments[4]||0);let Ee,Ie,Fe,ke,_e,Ge,He,Ze,rt;const st=A.isCompressedTexture?A.mipmaps[J]:A.image;re!==null?(Ee=re.max.x-re.min.x,Ie=re.max.y-re.min.y,Fe=re.max.z-re.min.z,ke=re.min.x,_e=re.min.y,Ge=re.min.z):(Ee=st.width,Ie=st.height,Fe=st.depth,ke=0,_e=0,Ge=0),ae!==null?(He=ae.x,Ze=ae.y,rt=ae.z):(He=0,Ze=0,rt=0);const _t=me.convert(Y.format),Qe=me.convert(Y.type);let ze;if(Y.isData3DTexture)fe.setTexture3D(Y,0),ze=D.TEXTURE_3D;else if(Y.isDataArrayTexture||Y.isCompressedArrayTexture)fe.setTexture2DArray(Y,0),ze=D.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,Y.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Y.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,Y.unpackAlignment);const pt=D.getParameter(D.UNPACK_ROW_LENGTH),et=D.getParameter(D.UNPACK_IMAGE_HEIGHT),Vt=D.getParameter(D.UNPACK_SKIP_PIXELS),Mn=D.getParameter(D.UNPACK_SKIP_ROWS),tn=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,st.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,st.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,ke),D.pixelStorei(D.UNPACK_SKIP_ROWS,_e),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Ge),A.isDataTexture||A.isData3DTexture?D.texSubImage3D(ze,J,He,Ze,rt,Ee,Ie,Fe,_t,Qe,st.data):Y.isCompressedArrayTexture?D.compressedTexSubImage3D(ze,J,He,Ze,rt,Ee,Ie,Fe,_t,st.data):D.texSubImage3D(ze,J,He,Ze,rt,Ee,Ie,Fe,_t,Qe,st),D.pixelStorei(D.UNPACK_ROW_LENGTH,pt),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,et),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Vt),D.pixelStorei(D.UNPACK_SKIP_ROWS,Mn),D.pixelStorei(D.UNPACK_SKIP_IMAGES,tn),J===0&&Y.generateMipmaps&&D.generateMipmap(ze),de.unbindTexture()},this.initRenderTarget=function(A){Me.get(A).__webglFramebuffer===void 0&&fe.setupRenderTarget(A)},this.initTexture=function(A){A.isCubeTexture?fe.setTextureCube(A,0):A.isData3DTexture?fe.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?fe.setTexture2DArray(A,0):fe.setTexture2D(A,0),de.unbindTexture()},this.resetState=function(){R=0,w=0,T=null,de.reset(),xe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return xn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=e===za?"display-p3":"srgb",t.unpackColorSpace=nt.workingColorSpace===xs?"display-p3":"srgb"}}class qg extends xt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new ln,this.environmentIntensity=1,this.environmentRotation=new ln,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Kg extends Tt{constructor(e=null,t=1,n=1,r,i,a,o,l,c=Lt,h=Lt,f,u){super(null,a,o,l,c,h,r,i,f,u),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ra extends jt{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const bi=new it,Dl=new it,qr=[],Ll=new Sn,Zg=new it,nr=new Rt,ir=new ni;class jc extends Rt{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Ra(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let r=0;r<n;r++)this.setMatrixAt(r,Zg)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Sn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,bi),Ll.copy(e.boundingBox).applyMatrix4(bi),this.boundingBox.union(Ll)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new ni),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,bi),ir.copy(e.boundingSphere).applyMatrix4(bi),this.boundingSphere.union(ir)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,i=n.length+1,a=e*i+1;for(let o=0;o<n.length;o++)n[o]=r[a+o]}raycast(e,t){const n=this.matrixWorld,r=this.count;if(nr.geometry=this.geometry,nr.material=this.material,nr.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),ir.copy(this.boundingSphere),ir.applyMatrix4(n),e.ray.intersectsSphere(ir)!==!1))for(let i=0;i<r;i++){this.getMatrixAt(i,bi),Dl.multiplyMatrices(n,bi),nr.matrixWorld=Dl,nr.raycast(e,qr);for(let a=0,o=qr.length;a<o;a++){const l=qr[a];l.instanceId=i,l.object=this,t.push(l)}qr.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Ra(new Float32Array(this.instanceMatrix.count*3),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){const n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new Kg(new Float32Array(r*this.count),r,this.count,Sc,vn));const i=this.morphTexture.source.data.data;let a=0;for(let c=0;c<n.length;c++)a+=n[c];const o=this.geometry.morphTargetsRelative?1:1-a,l=r*e;i[l]=o,i.set(n,l+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}}class qc extends Bi{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ye(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const gs=new V,_s=new V,Il=new it,rr=new ys,Kr=new ni,ma=new V,Fl=new V;class Jg extends xt{constructor(e=new zt,t=new qc){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let r=1,i=t.count;r<i;r++)gs.fromBufferAttribute(t,r-1),_s.fromBufferAttribute(t,r),n[r]=n[r-1],n[r]+=gs.distanceTo(_s);e.setAttribute("lineDistance",new yt(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const n=this.geometry,r=this.matrixWorld,i=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Kr.copy(n.boundingSphere),Kr.applyMatrix4(r),Kr.radius+=i,e.ray.intersectsSphere(Kr)===!1)return;Il.copy(r).invert(),rr.copy(e.ray).applyMatrix4(Il);const o=i/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){const d=Math.max(0,a.start),g=Math.min(h.count,a.start+a.count);for(let _=d,p=g-1;_<p;_+=c){const m=h.getX(_),M=h.getX(_+1),v=Zr(this,e,rr,l,m,M);v&&t.push(v)}if(this.isLineLoop){const _=h.getX(g-1),p=h.getX(d),m=Zr(this,e,rr,l,_,p);m&&t.push(m)}}else{const d=Math.max(0,a.start),g=Math.min(u.count,a.start+a.count);for(let _=d,p=g-1;_<p;_+=c){const m=Zr(this,e,rr,l,_,_+1);m&&t.push(m)}if(this.isLineLoop){const _=Zr(this,e,rr,l,g-1,d);_&&t.push(_)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let i=0,a=r.length;i<a;i++){const o=r[i].name||String(i);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=i}}}}}function Zr(s,e,t,n,r,i){const a=s.geometry.attributes.position;if(gs.fromBufferAttribute(a,r),_s.fromBufferAttribute(a,i),t.distanceSqToSegment(gs,_s,ma,Fl)>n)return;ma.applyMatrix4(s.matrixWorld);const l=e.ray.origin.distanceTo(ma);if(!(l<e.near||l>e.far))return{distance:l,point:Fl.clone().applyMatrix4(s.matrixWorld),index:r,face:null,faceIndex:null,object:s}}const Nl=new V,Ol=new V;class Qg extends Jg{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let r=0,i=t.count;r<i;r+=2)Nl.fromBufferAttribute(t,r),Ol.fromBufferAttribute(t,r+1),n[r]=r===0?0:n[r-1],n[r+1]=n[r]+Nl.distanceTo(Ol);e.setAttribute("lineDistance",new yt(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class bs extends zt{constructor(e=[],t=[],n=1,r=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:e,indices:t,radius:n,detail:r};const i=[],a=[];o(r),c(n),h(),this.setAttribute("position",new yt(i,3)),this.setAttribute("normal",new yt(i.slice(),3)),this.setAttribute("uv",new yt(a,2)),r===0?this.computeVertexNormals():this.normalizeNormals();function o(M){const v=new V,b=new V,R=new V;for(let w=0;w<t.length;w+=3)d(t[w+0],v),d(t[w+1],b),d(t[w+2],R),l(v,b,R,M)}function l(M,v,b,R){const w=R+1,T=[];for(let P=0;P<=w;P++){T[P]=[];const E=M.clone().lerp(b,P/w),y=v.clone().lerp(b,P/w),L=w-P;for(let U=0;U<=L;U++)U===0&&P===w?T[P][U]=E:T[P][U]=E.clone().lerp(y,U/L)}for(let P=0;P<w;P++)for(let E=0;E<2*(w-P)-1;E++){const y=Math.floor(E/2);E%2===0?(u(T[P][y+1]),u(T[P+1][y]),u(T[P][y])):(u(T[P][y+1]),u(T[P+1][y+1]),u(T[P+1][y]))}}function c(M){const v=new V;for(let b=0;b<i.length;b+=3)v.x=i[b+0],v.y=i[b+1],v.z=i[b+2],v.normalize().multiplyScalar(M),i[b+0]=v.x,i[b+1]=v.y,i[b+2]=v.z}function h(){const M=new V;for(let v=0;v<i.length;v+=3){M.x=i[v+0],M.y=i[v+1],M.z=i[v+2];const b=p(M)/2/Math.PI+.5,R=m(M)/Math.PI+.5;a.push(b,1-R)}g(),f()}function f(){for(let M=0;M<a.length;M+=6){const v=a[M+0],b=a[M+2],R=a[M+4],w=Math.max(v,b,R),T=Math.min(v,b,R);w>.9&&T<.1&&(v<.2&&(a[M+0]+=1),b<.2&&(a[M+2]+=1),R<.2&&(a[M+4]+=1))}}function u(M){i.push(M.x,M.y,M.z)}function d(M,v){const b=M*3;v.x=e[b+0],v.y=e[b+1],v.z=e[b+2]}function g(){const M=new V,v=new V,b=new V,R=new V,w=new Oe,T=new Oe,P=new Oe;for(let E=0,y=0;E<i.length;E+=9,y+=6){M.set(i[E+0],i[E+1],i[E+2]),v.set(i[E+3],i[E+4],i[E+5]),b.set(i[E+6],i[E+7],i[E+8]),w.set(a[y+0],a[y+1]),T.set(a[y+2],a[y+3]),P.set(a[y+4],a[y+5]),R.copy(M).add(v).add(b).divideScalar(3);const L=p(R);_(w,y+0,M,L),_(T,y+2,v,L),_(P,y+4,b,L)}}function _(M,v,b,R){R<0&&M.x===1&&(a[v]=M.x-1),b.x===0&&b.z===0&&(a[v]=R/2/Math.PI+.5)}function p(M){return Math.atan2(M.z,-M.x)}function m(M){return Math.atan2(-M.y,Math.sqrt(M.x*M.x+M.z*M.z))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new bs(e.vertices,e.indices,e.radius,e.details)}}class Wa extends bs{constructor(e=1,t=0){const n=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],r=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super(n,r,e,t),this.type="OctahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Wa(e.radius,e.detail)}}class Es extends zt{constructor(e=1,t=32,n=16,r=0,i=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:i,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(a+o,Math.PI);let c=0;const h=[],f=new V,u=new V,d=[],g=[],_=[],p=[];for(let m=0;m<=n;m++){const M=[],v=m/n;let b=0;m===0&&a===0?b=.5/t:m===n&&l===Math.PI&&(b=-.5/t);for(let R=0;R<=t;R++){const w=R/t;f.x=-e*Math.cos(r+w*i)*Math.sin(a+v*o),f.y=e*Math.cos(a+v*o),f.z=e*Math.sin(r+w*i)*Math.sin(a+v*o),g.push(f.x,f.y,f.z),u.copy(f).normalize(),_.push(u.x,u.y,u.z),p.push(w+b,1-v),M.push(c++)}h.push(M)}for(let m=0;m<n;m++)for(let M=0;M<t;M++){const v=h[m][M+1],b=h[m][M],R=h[m+1][M],w=h[m+1][M+1];(m!==0||a>0)&&d.push(v,b,w),(m!==n-1||l<Math.PI)&&d.push(b,R,w)}this.setIndex(d),this.setAttribute("position",new yt(g,3)),this.setAttribute("normal",new yt(_,3)),this.setAttribute("uv",new yt(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Es(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}class Xa extends bs{constructor(e=1,t=0){const n=[1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],r=[2,1,0,0,3,2,1,3,0,2,3,1];super(n,r,e,t),this.type="TetrahedronGeometry",this.parameters={radius:e,detail:t}}static fromJSON(e){return new Xa(e.radius,e.detail)}}class $g extends Bi{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new Ye(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ye(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=wc,this.normalScale=new Oe(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new ln,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Kc extends xt{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ye(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}}const ga=new it,Bl=new V,kl=new V;class e_{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Oe(512,512),this.map=null,this.mapPass=null,this.matrix=new it,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Ha,this._frameExtents=new Oe(1,1),this._viewportCount=1,this._viewports=[new ht(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,n=this.matrix;Bl.setFromMatrixPosition(e.matrixWorld),t.position.copy(Bl),kl.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(kl),t.updateMatrixWorld(),ga.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ga),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(ga)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class t_ extends e_{constructor(){super(new Ss(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class n_ extends Kc{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(xt.DEFAULT_UP),this.updateMatrix(),this.target=new xt,this.shadow=new t_}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class i_ extends Kc{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class r_ extends zt{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){const e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}}class Zc{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=zl(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){const t=zl();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}}function zl(){return(typeof performance>"u"?Date:performance).now()}const Gl=new it;class s_{constructor(e,t,n=0,r=1/0){this.ray=new ys(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new Ga,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return Gl.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(Gl),this}intersectObject(e,t=!0,n=[]){return Pa(e,this,n,t),n.sort(Hl),n}intersectObjects(e,t=!0,n=[]){for(let r=0,i=e.length;r<i;r++)Pa(e[r],this,n,t);return n.sort(Hl),n}}function Hl(s,e){return s.distance-e.distance}function Pa(s,e,t,n){let r=!0;if(s.layers.test(e.layers)&&s.raycast(e,t)===!1&&(r=!1),r===!0&&n===!0){const i=s.children;for(let a=0,o=i.length;a<o;a++)Pa(i[a],e,t,!0)}}class Ua{constructor(e=1,t=0,n=0){return this.radius=e,this.phi=t,this.theta=n,this}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(Ct(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:ka}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=ka);function a_(){const s=document.activeElement;if(!s)return!1;const e=s.tagName;return e==="INPUT"||e==="TEXTAREA"||e==="SELECT"||s.isContentEditable}const Jr=.06,Qr=.92,$r=40,Vl=.05;class o_{constructor(e,t,{is2d:n=!1,target:r=window}={}){this.camera=e,this.controls=t,this.is2d=n,this._spherical=new Ua,this._offset=new V,this.home={position:e.position.clone(),target:t.target.clone(),zoom:e.zoom},r.addEventListener("keydown",i=>{a_()||this.handleKey(i.code)&&i.preventDefault()})}handleKey(e){if(this.is2d)switch(e){case"KeyW":return this._pan(0,$r),!0;case"KeyS":return this._pan(0,-$r),!0;case"KeyA":return this._pan(-$r,0),!0;case"KeyD":return this._pan($r,0),!0;case"KeyQ":return this._zoom(Qr),!0;case"KeyE":return this._zoom(1/Qr),!0;case"Space":case"KeyR":return this.reset(),!0;default:return!1}switch(e){case"KeyW":return this._orbit(0,-Jr),!0;case"KeyS":return this._orbit(0,Jr),!0;case"KeyA":return this._orbit(Jr,0),!0;case"KeyD":return this._orbit(-Jr,0),!0;case"KeyQ":return this._zoom(Qr),!0;case"KeyE":return this._zoom(1/Qr),!0;case"Space":case"KeyR":return this.reset(),!0;default:return!1}}_orbit(e,t){this._offset.copy(this.camera.position).sub(this.controls.target),this._spherical.setFromVector3(this._offset),this._spherical.theta+=e,this._spherical.phi=Math.min(Math.PI-Vl,Math.max(Vl,this._spherical.phi+t)),this._offset.setFromSpherical(this._spherical),this.camera.position.copy(this.controls.target).add(this._offset),this.camera.lookAt(this.controls.target),this._changed()}_zoom(e){this.is2d?(this.camera.zoom=Math.min(20,Math.max(.05,this.camera.zoom/e)),this.camera.updateProjectionMatrix()):(this._offset.copy(this.camera.position).sub(this.controls.target),this._offset.multiplyScalar(e),this.camera.position.copy(this.controls.target).add(this._offset)),this._changed()}_pan(e,t){this.camera.position.x+=e,this.camera.position.y+=t,this.controls.target.x+=e,this.controls.target.y+=t,this._changed()}reset(){this.camera.position.copy(this.home.position),this.controls.target.copy(this.home.target),this.camera.zoom=this.home.zoom,this.camera.updateProjectionMatrix(),this.camera.lookAt(this.controls.target),this._changed()}_changed(){this.controls.update(),this.controls.dispatchEvent({type:"change"})}}const l_=5;function Pi(s,e={}){return{type:"event",event:s,payload:e}}function c_(s,e,t,n,r=l_){return Math.hypot(t-s,n-e)<r}class h_{constructor(e,t,n,{requestFrame:r=o=>requestAnimationFrame(o),onNodeClick:i=()=>{},onBackgroundClick:a=()=>{}}={}){this.pickFn=t,this.sendFn=n,this.requestFrame=r,this.onNodeClick=i,this.onBackgroundClick=a,this.hoverId=null,this.pointerDown=null,this.pendingMove=null,e.addEventListener("pointermove",o=>this._onMove(o)),e.addEventListener("pointerdown",o=>{this.pointerDown={x:o.clientX,y:o.clientY}}),e.addEventListener("pointerup",o=>this._onUp(o))}_onMove(e){const t=this.pendingMove===null;this.pendingMove={x:e.clientX,y:e.clientY},t&&this.requestFrame(()=>{const n=this.pendingMove;this.pendingMove=null,this._hover(n.x,n.y)})}_hover(e,t){const n=this.pickFn(e,t);n!==this.hoverId&&(this.hoverId=n,this.sendFn(Pi("node_hover",{node_id:n})))}_onUp(e){if(!this.pointerDown)return;const{x:t,y:n}=this.pointerDown;if(this.pointerDown=null,!c_(t,n,e.clientX,e.clientY))return;const r=this.pickFn(e.clientX,e.clientY);r!==null?(this.sendFn(Pi("node_click",{node_id:r})),this.onNodeClick(r)):(this.sendFn(Pi("background_click")),this.onBackgroundClick())}}class u_{constructor(e){this.ids=[],this.positions=new Float32Array(0),this.worker=new Worker(new URL("/assets/worker-CJ3O9S4R.js",import.meta.url),{type:"module"}),this.worker.onmessage=({data:t})=>{t.type==="index"?this.ids=t.ids:t.type==="tick"&&(this.positions=t.positions)},e.subscribe(t=>this._onStoreEvent(e,t))}_onStoreEvent(e,t){if(t.kind==="init")this.worker.postMessage({type:"init",dimensions:e.config.dimensions,nodes:[...e.nodes.values()].map(n=>({id:n.id})),links:[...e.edges.values()].map(n=>({source:n.source,target:n.target}))});else if(t.kind==="patch"){const n=t.patch;this.worker.postMessage({type:"patch",addNodes:n.add_nodes.map(r=>({id:r.id})),removeNodes:n.remove_nodes,addLinks:n.add_edges.map(r=>({source:r.source,target:r.target})),removeLinks:n.remove_edges})}}}const f_=2;class d_{constructor(e,{threshold:t=30,holdSeconds:n=3,smoothing:r=2}={}){this.onDegrade=e,this.threshold=t,this.holdSeconds=n,this.smoothing=r,this.avgFps=null,this.below=0,this.steps=0}frame(e){if(e<=0||this.steps>=f_)return;const t=1/e;this.avgFps=this.avgFps===null?t:this.avgFps+(t-this.avgFps)*Math.min(1,e*this.smoothing),this.avgFps<this.threshold?(this.below+=e,this.below>=this.holdSeconds&&(this.below=0,this.steps+=1,this.onDegrade(this.steps))):this.below=0}}const Wl={type:"change"},_a={type:"start"},Xl={type:"end"},es=new ys,Yl=new Dn,p_=Math.cos(70*zu.DEG2RAD);class jl extends ti{constructor(e,t){super(),this.object=e,this.domElement=t,this.domElement.style.touchAction="none",this.enabled=!0,this.target=new V,this.cursor=new V,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:_n.ROTATE,MIDDLE:_n.DOLLY,RIGHT:_n.PAN},this.touches={ONE:Un.ROTATE,TWO:Un.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this.getPolarAngle=function(){return o.phi},this.getAzimuthalAngle=function(){return o.theta},this.getDistance=function(){return this.object.position.distanceTo(this.target)},this.listenToKeyEvents=function(S){S.addEventListener("keydown",ce),this._domElementKeyEvents=S},this.stopListenToKeyEvents=function(){this._domElementKeyEvents.removeEventListener("keydown",ce),this._domElementKeyEvents=null},this.saveState=function(){n.target0.copy(n.target),n.position0.copy(n.object.position),n.zoom0=n.object.zoom},this.reset=function(){n.target.copy(n.target0),n.object.position.copy(n.position0),n.object.zoom=n.zoom0,n.object.updateProjectionMatrix(),n.dispatchEvent(Wl),n.update(),i=r.NONE},this.update=function(){const S=new V,$=new ei().setFromUnitVectors(e.up,new V(0,1,0)),z=$.clone().invert(),ee=new V,ge=new ei,Ae=new V,Re=2*Math.PI;return function(We=null){const Le=n.object.position;S.copy(Le).sub(n.target),S.applyQuaternion($),o.setFromVector3(S),n.autoRotate&&i===r.NONE&&U(y(We)),n.enableDamping?(o.theta+=l.theta*n.dampingFactor,o.phi+=l.phi*n.dampingFactor):(o.theta+=l.theta,o.phi+=l.phi);let Xe=n.minAzimuthAngle,Je=n.maxAzimuthAngle;isFinite(Xe)&&isFinite(Je)&&(Xe<-Math.PI?Xe+=Re:Xe>Math.PI&&(Xe-=Re),Je<-Math.PI?Je+=Re:Je>Math.PI&&(Je-=Re),Xe<=Je?o.theta=Math.max(Xe,Math.min(Je,o.theta)):o.theta=o.theta>(Xe+Je)/2?Math.max(Xe,o.theta):Math.min(Je,o.theta)),o.phi=Math.max(n.minPolarAngle,Math.min(n.maxPolarAngle,o.phi)),o.makeSafe(),n.enableDamping===!0?n.target.addScaledVector(h,n.dampingFactor):n.target.add(h),n.target.sub(n.cursor),n.target.clampLength(n.minTargetRadius,n.maxTargetRadius),n.target.add(n.cursor);let tt=!1;if(n.zoomToCursor&&w||n.object.isOrthographicCamera)o.radius=q(o.radius);else{const $e=o.radius;o.radius=q(o.radius*c),tt=$e!=o.radius}if(S.setFromSpherical(o),S.applyQuaternion(z),Le.copy(n.target).add(S),n.object.lookAt(n.target),n.enableDamping===!0?(l.theta*=1-n.dampingFactor,l.phi*=1-n.dampingFactor,h.multiplyScalar(1-n.dampingFactor)):(l.set(0,0,0),h.set(0,0,0)),n.zoomToCursor&&w){let $e=null;if(n.object.isPerspectiveCamera){const lt=S.length();$e=q(lt*c);const St=lt-$e;n.object.position.addScaledVector(b,St),n.object.updateMatrixWorld(),tt=!!St}else if(n.object.isOrthographicCamera){const lt=new V(R.x,R.y,0);lt.unproject(n.object);const St=n.object.zoom;n.object.zoom=Math.max(n.minZoom,Math.min(n.maxZoom,n.object.zoom/c)),n.object.updateProjectionMatrix(),tt=St!==n.object.zoom;const gt=new V(R.x,R.y,0);gt.unproject(n.object),n.object.position.sub(gt).add(lt),n.object.updateMatrixWorld(),$e=S.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),n.zoomToCursor=!1;$e!==null&&(this.screenSpacePanning?n.target.set(0,0,-1).transformDirection(n.object.matrix).multiplyScalar($e).add(n.object.position):(es.origin.copy(n.object.position),es.direction.set(0,0,-1).transformDirection(n.object.matrix),Math.abs(n.object.up.dot(es.direction))<p_?e.lookAt(n.target):(Yl.setFromNormalAndCoplanarPoint(n.object.up,n.target),es.intersectPlane(Yl,n.target))))}else if(n.object.isOrthographicCamera){const $e=n.object.zoom;n.object.zoom=Math.max(n.minZoom,Math.min(n.maxZoom,n.object.zoom/c)),$e!==n.object.zoom&&(n.object.updateProjectionMatrix(),tt=!0)}return c=1,w=!1,tt||ee.distanceToSquared(n.object.position)>a||8*(1-ge.dot(n.object.quaternion))>a||Ae.distanceToSquared(n.target)>a?(n.dispatchEvent(Wl),ee.copy(n.object.position),ge.copy(n.object.quaternion),Ae.copy(n.target),!0):!1}}(),this.dispose=function(){n.domElement.removeEventListener("contextmenu",be),n.domElement.removeEventListener("pointerdown",Ce),n.domElement.removeEventListener("pointercancel",x),n.domElement.removeEventListener("wheel",ie),n.domElement.removeEventListener("pointermove",C),n.domElement.removeEventListener("pointerup",x),n.domElement.getRootNode().removeEventListener("keydown",Te,{capture:!0}),n._domElementKeyEvents!==null&&(n._domElementKeyEvents.removeEventListener("keydown",ce),n._domElementKeyEvents=null)};const n=this,r={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6};let i=r.NONE;const a=1e-6,o=new Ua,l=new Ua;let c=1;const h=new V,f=new Oe,u=new Oe,d=new Oe,g=new Oe,_=new Oe,p=new Oe,m=new Oe,M=new Oe,v=new Oe,b=new V,R=new Oe;let w=!1;const T=[],P={};let E=!1;function y(S){return S!==null?2*Math.PI/60*n.autoRotateSpeed*S:2*Math.PI/60/60*n.autoRotateSpeed}function L(S){const $=Math.abs(S*.01);return Math.pow(.95,n.zoomSpeed*$)}function U(S){l.theta-=S}function I(S){l.phi-=S}const N=function(){const S=new V;return function(z,ee){S.setFromMatrixColumn(ee,0),S.multiplyScalar(-z),h.add(S)}}(),W=function(){const S=new V;return function(z,ee){n.screenSpacePanning===!0?S.setFromMatrixColumn(ee,1):(S.setFromMatrixColumn(ee,0),S.crossVectors(n.object.up,S)),S.multiplyScalar(z),h.add(S)}}(),k=function(){const S=new V;return function(z,ee){const ge=n.domElement;if(n.object.isPerspectiveCamera){const Ae=n.object.position;S.copy(Ae).sub(n.target);let Re=S.length();Re*=Math.tan(n.object.fov/2*Math.PI/180),N(2*z*Re/ge.clientHeight,n.object.matrix),W(2*ee*Re/ge.clientHeight,n.object.matrix)}else n.object.isOrthographicCamera?(N(z*(n.object.right-n.object.left)/n.object.zoom/ge.clientWidth,n.object.matrix),W(ee*(n.object.top-n.object.bottom)/n.object.zoom/ge.clientHeight,n.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),n.enablePan=!1)}}();function se(S){n.object.isPerspectiveCamera||n.object.isOrthographicCamera?c/=S:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),n.enableZoom=!1)}function j(S){n.object.isPerspectiveCamera||n.object.isOrthographicCamera?c*=S:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),n.enableZoom=!1)}function K(S,$){if(!n.zoomToCursor)return;w=!0;const z=n.domElement.getBoundingClientRect(),ee=S-z.left,ge=$-z.top,Ae=z.width,Re=z.height;R.x=ee/Ae*2-1,R.y=-(ge/Re)*2+1,b.set(R.x,R.y,1).unproject(n.object).sub(n.object.position).normalize()}function q(S){return Math.max(n.minDistance,Math.min(n.maxDistance,S))}function F(S){f.set(S.clientX,S.clientY)}function H(S){K(S.clientX,S.clientX),m.set(S.clientX,S.clientY)}function ne(S){g.set(S.clientX,S.clientY)}function O(S){u.set(S.clientX,S.clientY),d.subVectors(u,f).multiplyScalar(n.rotateSpeed);const $=n.domElement;U(2*Math.PI*d.x/$.clientHeight),I(2*Math.PI*d.y/$.clientHeight),f.copy(u),n.update()}function B(S){M.set(S.clientX,S.clientY),v.subVectors(M,m),v.y>0?se(L(v.y)):v.y<0&&j(L(v.y)),m.copy(M),n.update()}function te(S){_.set(S.clientX,S.clientY),p.subVectors(_,g).multiplyScalar(n.panSpeed),k(p.x,p.y),g.copy(_),n.update()}function G(S){K(S.clientX,S.clientY),S.deltaY<0?j(L(S.deltaY)):S.deltaY>0&&se(L(S.deltaY)),n.update()}function oe(S){let $=!1;switch(S.code){case n.keys.UP:S.ctrlKey||S.metaKey||S.shiftKey?I(2*Math.PI*n.rotateSpeed/n.domElement.clientHeight):k(0,n.keyPanSpeed),$=!0;break;case n.keys.BOTTOM:S.ctrlKey||S.metaKey||S.shiftKey?I(-2*Math.PI*n.rotateSpeed/n.domElement.clientHeight):k(0,-n.keyPanSpeed),$=!0;break;case n.keys.LEFT:S.ctrlKey||S.metaKey||S.shiftKey?U(2*Math.PI*n.rotateSpeed/n.domElement.clientHeight):k(n.keyPanSpeed,0),$=!0;break;case n.keys.RIGHT:S.ctrlKey||S.metaKey||S.shiftKey?U(-2*Math.PI*n.rotateSpeed/n.domElement.clientHeight):k(-n.keyPanSpeed,0),$=!0;break}$&&(S.preventDefault(),n.update())}function pe(S){if(T.length===1)f.set(S.pageX,S.pageY);else{const $=Ne(S),z=.5*(S.pageX+$.x),ee=.5*(S.pageY+$.y);f.set(z,ee)}}function ve(S){if(T.length===1)g.set(S.pageX,S.pageY);else{const $=Ne(S),z=.5*(S.pageX+$.x),ee=.5*(S.pageY+$.y);g.set(z,ee)}}function D(S){const $=Ne(S),z=S.pageX-$.x,ee=S.pageY-$.y,ge=Math.sqrt(z*z+ee*ee);m.set(0,ge)}function he(S){n.enableZoom&&D(S),n.enablePan&&ve(S)}function Pe(S){n.enableZoom&&D(S),n.enableRotate&&pe(S)}function Ue(S){if(T.length==1)u.set(S.pageX,S.pageY);else{const z=Ne(S),ee=.5*(S.pageX+z.x),ge=.5*(S.pageY+z.y);u.set(ee,ge)}d.subVectors(u,f).multiplyScalar(n.rotateSpeed);const $=n.domElement;U(2*Math.PI*d.x/$.clientHeight),I(2*Math.PI*d.y/$.clientHeight),f.copy(u)}function de(S){if(T.length===1)_.set(S.pageX,S.pageY);else{const $=Ne(S),z=.5*(S.pageX+$.x),ee=.5*(S.pageY+$.y);_.set(z,ee)}p.subVectors(_,g).multiplyScalar(n.panSpeed),k(p.x,p.y),g.copy(_)}function ye(S){const $=Ne(S),z=S.pageX-$.x,ee=S.pageY-$.y,ge=Math.sqrt(z*z+ee*ee);M.set(0,ge),v.set(0,Math.pow(M.y/m.y,n.zoomSpeed)),se(v.y),m.copy(M);const Ae=(S.pageX+$.x)*.5,Re=(S.pageY+$.y)*.5;K(Ae,Re)}function Me(S){n.enableZoom&&ye(S),n.enablePan&&de(S)}function fe(S){n.enableZoom&&ye(S),n.enableRotate&&Ue(S)}function Ce(S){n.enabled!==!1&&(T.length===0&&(n.domElement.setPointerCapture(S.pointerId),n.domElement.addEventListener("pointermove",C),n.domElement.addEventListener("pointerup",x)),!me(S)&&(Be(S),S.pointerType==="touch"?Se(S):X(S)))}function C(S){n.enabled!==!1&&(S.pointerType==="touch"?ue(S):Z(S))}function x(S){switch(we(S),T.length){case 0:n.domElement.releasePointerCapture(S.pointerId),n.domElement.removeEventListener("pointermove",C),n.domElement.removeEventListener("pointerup",x),n.dispatchEvent(Xl),i=r.NONE;break;case 1:const $=T[0],z=P[$];Se({pointerId:$,pageX:z.x,pageY:z.y});break}}function X(S){let $;switch(S.button){case 0:$=n.mouseButtons.LEFT;break;case 1:$=n.mouseButtons.MIDDLE;break;case 2:$=n.mouseButtons.RIGHT;break;default:$=-1}switch($){case _n.DOLLY:if(n.enableZoom===!1)return;H(S),i=r.DOLLY;break;case _n.ROTATE:if(S.ctrlKey||S.metaKey||S.shiftKey){if(n.enablePan===!1)return;ne(S),i=r.PAN}else{if(n.enableRotate===!1)return;F(S),i=r.ROTATE}break;case _n.PAN:if(S.ctrlKey||S.metaKey||S.shiftKey){if(n.enableRotate===!1)return;F(S),i=r.ROTATE}else{if(n.enablePan===!1)return;ne(S),i=r.PAN}break;default:i=r.NONE}i!==r.NONE&&n.dispatchEvent(_a)}function Z(S){switch(i){case r.ROTATE:if(n.enableRotate===!1)return;O(S);break;case r.DOLLY:if(n.enableZoom===!1)return;B(S);break;case r.PAN:if(n.enablePan===!1)return;te(S);break}}function ie(S){n.enabled===!1||n.enableZoom===!1||i!==r.NONE||(S.preventDefault(),n.dispatchEvent(_a),G(Q(S)),n.dispatchEvent(Xl))}function Q(S){const $=S.deltaMode,z={clientX:S.clientX,clientY:S.clientY,deltaY:S.deltaY};switch($){case 1:z.deltaY*=16;break;case 2:z.deltaY*=100;break}return S.ctrlKey&&!E&&(z.deltaY*=10),z}function Te(S){S.key==="Control"&&(E=!0,n.domElement.getRootNode().addEventListener("keyup",le,{passive:!0,capture:!0}))}function le(S){S.key==="Control"&&(E=!1,n.domElement.getRootNode().removeEventListener("keyup",le,{passive:!0,capture:!0}))}function ce(S){n.enabled===!1||n.enablePan===!1||oe(S)}function Se(S){switch(xe(S),T.length){case 1:switch(n.touches.ONE){case Un.ROTATE:if(n.enableRotate===!1)return;pe(S),i=r.TOUCH_ROTATE;break;case Un.PAN:if(n.enablePan===!1)return;ve(S),i=r.TOUCH_PAN;break;default:i=r.NONE}break;case 2:switch(n.touches.TWO){case Un.DOLLY_PAN:if(n.enableZoom===!1&&n.enablePan===!1)return;he(S),i=r.TOUCH_DOLLY_PAN;break;case Un.DOLLY_ROTATE:if(n.enableZoom===!1&&n.enableRotate===!1)return;Pe(S),i=r.TOUCH_DOLLY_ROTATE;break;default:i=r.NONE}break;default:i=r.NONE}i!==r.NONE&&n.dispatchEvent(_a)}function ue(S){switch(xe(S),i){case r.TOUCH_ROTATE:if(n.enableRotate===!1)return;Ue(S),n.update();break;case r.TOUCH_PAN:if(n.enablePan===!1)return;de(S),n.update();break;case r.TOUCH_DOLLY_PAN:if(n.enableZoom===!1&&n.enablePan===!1)return;Me(S),n.update();break;case r.TOUCH_DOLLY_ROTATE:if(n.enableZoom===!1&&n.enableRotate===!1)return;fe(S),n.update();break;default:i=r.NONE}}function be(S){n.enabled!==!1&&S.preventDefault()}function Be(S){T.push(S.pointerId)}function we(S){delete P[S.pointerId];for(let $=0;$<T.length;$++)if(T[$]==S.pointerId){T.splice($,1);return}}function me(S){for(let $=0;$<T.length;$++)if(T[$]==S.pointerId)return!0;return!1}function xe(S){let $=P[S.pointerId];$===void 0&&($=new Oe,P[S.pointerId]=$),$.set(S.pageX,S.pageY)}function Ne(S){const $=S.pointerId===T[0]?T[1]:T[0];return P[$]}n.domElement.addEventListener("contextmenu",be),n.domElement.addEventListener("pointerdown",Ce),n.domElement.addEventListener("pointercancel",x),n.domElement.addEventListener("wheel",ie,{passive:!1}),n.domElement.getRootNode().addEventListener("keydown",Te,{passive:!0,capture:!0}),this.update()}}const Jc={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class mr{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const m_=new Ss(-1,1,1,-1,0,1);class g_ extends zt{constructor(){super(),this.setAttribute("position",new yt([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new yt([0,2,0,0,2,0],2))}}const __=new g_;class Qc{constructor(e){this._mesh=new Rt(__,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,m_)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class v_ extends mr{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof It?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=fr.clone(e.uniforms),this.material=new It({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new Qc(this.material)}render(e,t,n){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=n.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class ql extends mr{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,n){const r=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let a,o;this.inverse?(a=0,o=1):(a=1,o=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(r.REPLACE,r.REPLACE,r.REPLACE),i.buffers.stencil.setFunc(r.ALWAYS,a,4294967295),i.buffers.stencil.setClear(o),i.buffers.stencil.setLocked(!0),e.setRenderTarget(n),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(r.EQUAL,1,4294967295),i.buffers.stencil.setOp(r.KEEP,r.KEEP,r.KEEP),i.buffers.stencil.setLocked(!0)}}class x_ extends mr{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class y_{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const n=e.getSize(new Oe);this._width=n.width,this._height=n.height,t=new en(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:Fn}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new v_(Jc),this.copyPass.material.blending=yn,this.clock=new Zc}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let n=!1;for(let r=0,i=this.passes.length;r<i;r++){const a=this.passes[r];if(a.enabled!==!1){if(a.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(r),a.render(this.renderer,this.writeBuffer,this.readBuffer,e,n),a.needsSwap){if(n){const o=this.renderer.getContext(),l=this.renderer.state.buffers.stencil;l.setFunc(o.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),l.setFunc(o.EQUAL,1,4294967295)}this.swapBuffers()}ql!==void 0&&(a instanceof ql?n=!0:a instanceof x_&&(n=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new Oe);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const n=this._width*this._pixelRatio,r=this._height*this._pixelRatio;this.renderTarget1.setSize(n,r),this.renderTarget2.setSize(n,r);for(let i=0;i<this.passes.length;i++)this.passes[i].setSize(n,r)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class S_ extends mr{constructor(e,t,n=null,r=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=n,this.clearColor=r,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new Ye}render(e,t,n){const r=e.autoClear;e.autoClear=!1;let i,a;this.overrideMaterial!==null&&(a=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:n),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=a),e.autoClear=r}}const M_={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new Ye(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			vec3 luma = vec3( 0.299, 0.587, 0.114 );

			float v = dot( texel.xyz, luma );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class Oi extends mr{constructor(e,t,n,r){super(),this.strength=t!==void 0?t:1,this.radius=n,this.threshold=r,this.resolution=e!==void 0?new Oe(e.x,e.y):new Oe(256,256),this.clearColor=new Ye(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);this.renderTargetBright=new en(i,a,{type:Fn}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let f=0;f<this.nMips;f++){const u=new en(i,a,{type:Fn});u.texture.name="UnrealBloomPass.h"+f,u.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(u);const d=new en(i,a,{type:Fn});d.texture.name="UnrealBloomPass.v"+f,d.texture.generateMipmaps=!1,this.renderTargetsVertical.push(d),i=Math.round(i/2),a=Math.round(a/2)}const o=M_;this.highPassUniforms=fr.clone(o.uniforms),this.highPassUniforms.luminosityThreshold.value=r,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new It({uniforms:this.highPassUniforms,vertexShader:o.vertexShader,fragmentShader:o.fragmentShader}),this.separableBlurMaterials=[];const l=[3,5,7,9,11];i=Math.round(this.resolution.x/2),a=Math.round(this.resolution.y/2);for(let f=0;f<this.nMips;f++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(l[f])),this.separableBlurMaterials[f].uniforms.invSize.value=new Oe(1/i,1/a),i=Math.round(i/2),a=Math.round(a/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const c=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=c,this.bloomTintColors=[new V(1,1,1),new V(1,1,1),new V(1,1,1),new V(1,1,1),new V(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const h=Jc;this.copyUniforms=fr.clone(h.uniforms),this.blendMaterial=new It({uniforms:this.copyUniforms,vertexShader:h.vertexShader,fragmentShader:h.fragmentShader,blending:ls,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new Ye,this.oldClearAlpha=1,this.basic=new pr,this.fsQuad=new Qc(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let n=Math.round(e/2),r=Math.round(t/2);this.renderTargetBright.setSize(n,r);for(let i=0;i<this.nMips;i++)this.renderTargetsHorizontal[i].setSize(n,r),this.renderTargetsVertical[i].setSize(n,r),this.separableBlurMaterials[i].uniforms.invSize.value=new Oe(1/n,1/r),n=Math.round(n/2),r=Math.round(r/2)}render(e,t,n,r,i){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const a=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),i&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=n.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=n.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let o=this.renderTargetBright;for(let l=0;l<this.nMips;l++)this.fsQuad.material=this.separableBlurMaterials[l],this.separableBlurMaterials[l].uniforms.colorTexture.value=o.texture,this.separableBlurMaterials[l].uniforms.direction.value=Oi.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[l]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[l].uniforms.colorTexture.value=this.renderTargetsHorizontal[l].texture,this.separableBlurMaterials[l].uniforms.direction.value=Oi.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[l]),e.clear(),this.fsQuad.render(e),o=this.renderTargetsVertical[l];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,i&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(n),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=a}getSeperableBlurMaterial(e){const t=[];for(let n=0;n<e;n++)t.push(.39894*Math.exp(-.5*n*n/(e*e))/e);return new It({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new Oe(.5,.5)},direction:{value:new Oe(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new It({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}Oi.BlurDirectionX=new Oe(1,0);Oi.BlurDirectionY=new Oe(0,1);const b_={background:"#f4f5f7",palette:["#2f7fe8","#e8553a","#2fa84f","#8a4fe8","#e8a02f","#1fb3c4","#d44f9e","#5b6472"],node:{color:"#2f7fe8",size:1,shape:"sphere",emissive:"#000000",emissiveIntensity:0},edge:{color:"#9aa3af",opacity:.5},lights:{ambient:{color:"#ffffff",intensity:.7},directional:{color:"#ffffff",intensity:1.2}},label:{color:"#1f2430",size:6,halo:"#f4f5f7",budget:200},detailBox:{"--vb-detail-bg":"rgba(255,255,255,0.95)","--vb-detail-fg":"#1f2430","--vb-detail-key":"#667788","--vb-detail-shadow":"0 4px 16px rgba(0,0,0,0.18)","--vb-status-bg":"rgba(20,23,28,0.85)","--vb-status-fg":"#ffffff"},bloom:{enabled:!1,strength:.8,radius:.6,threshold:.15},window:{headerBg:"#d8dde6",headerFg:"#1f2430",gadget:"#5a6573",bodyBg:"rgba(255,255,255,0.97)",bodyFg:"#1f2430",key:"#667788",dockBg:"#c2c9d4",shadow:"0 6px 20px rgba(0,0,0,0.22)"},flow:{size:2.4,baseSpeed:220,color:"#2f7fe8",opacity:.85}},E_={background:"#0a0e1a",palette:["#28d7fe","#ff2a6d","#05ffa1","#b967ff","#ffd166","#01c8ee","#ff6e27","#e8f8ff"],node:{color:"#28d7fe",size:1,shape:"sphere",emissive:"#1b3a5c",emissiveIntensity:1.2},edge:{color:"#1f4f6e",opacity:.65},lights:{ambient:{color:"#314466",intensity:.9},directional:{color:"#9fd8ff",intensity:1.4}},label:{color:"#d7f4ff",size:6,halo:"#0a0e1a",budget:200},detailBox:{"--vb-detail-bg":"rgba(10,16,28,0.92)","--vb-detail-fg":"#d7f4ff","--vb-detail-key":"#5a7d9e","--vb-detail-shadow":"0 0 18px rgba(40,215,254,0.35)","--vb-status-bg":"rgba(40,215,254,0.15)","--vb-status-fg":"#d7f4ff"},bloom:{enabled:!0,strength:.9,radius:.7,threshold:.15},window:{headerBg:"rgba(40,215,254,0.18)",headerFg:"#d7f4ff",gadget:"#28d7fe",bodyBg:"rgba(10,16,28,0.94)",bodyFg:"#d7f4ff",key:"#5a7d9e",dockBg:"rgba(40,215,254,0.12)",shadow:"0 0 22px rgba(40,215,254,0.45)"},flow:{size:3,baseSpeed:260,color:"#28d7fe",opacity:1}},sr={modern:b_,cyber:E_};function Da(s){return s!==null&&typeof s=="object"&&!Array.isArray(s)}function $c(s,e){const t={...s};for(const[n,r]of Object.entries(e))t[n]=Da(t[n])&&Da(r)?$c(t[n],r):r;return t}function eh(s){return typeof s=="string"?sr[s]?sr[s]:(console.error(`viewbase: neznámé téma '${s}' – používám 'modern'`),sr.modern):Da(s)?$c(sr.modern,s):(s!=null&&console.error("viewbase: theme musí být string nebo objekt – používám modern"),sr.modern)}function T_(s,e=document.documentElement){for(const[n,r]of Object.entries(s.detailBox))e.style.setProperty(n,r);const t=s.window;if(t){const n={"--vb-window-header-bg":t.headerBg,"--vb-window-header-fg":t.headerFg,"--vb-window-gadget":t.gadget,"--vb-window-body-bg":t.bodyBg,"--vb-window-body-fg":t.bodyFg,"--vb-window-key":t.key,"--vb-window-dock-bg":t.dockBg,"--vb-window-shadow":t.shadow};for(const[r,i]of Object.entries(n))i!=null&&e.style.setProperty(r,i)}}function th(s,e,t){const n=s.type!=null&&e[s.type]||{};return{shape:n.shape??t.node.shape,color:s.meta.color??n.color??t.node.color,size:s.meta.size??n.size??t.node.size}}function w_(){var s=Object.create(null);function e(r,i){var a=r.id,o=r.name,l=r.dependencies;l===void 0&&(l=[]);var c=r.init;c===void 0&&(c=function(){});var h=r.getTransferables;if(h===void 0&&(h=null),!s[a])try{l=l.map(function(u){return u&&u.isWorkerModule&&(e(u,function(d){if(d instanceof Error)throw d}),u=s[u.id].value),u}),c=n("<"+o+">.init",c),h&&(h=n("<"+o+">.getTransferables",h));var f=null;typeof c=="function"?f=c.apply(void 0,l):console.error("worker module init function failed to rehydrate"),s[a]={id:a,value:f,getTransferables:h},i(f)}catch(u){u&&u.noLog||console.error(u),i(u)}}function t(r,i){var a,o=r.id,l=r.args;(!s[o]||typeof s[o].value!="function")&&i(new Error("Worker module "+o+": not found or its 'init' did not return a function"));try{var c=(a=s[o]).value.apply(a,l);c&&typeof c.then=="function"?c.then(h,function(f){return i(f instanceof Error?f:new Error(""+f))}):h(c)}catch(f){i(f)}function h(f){try{var u=s[o].getTransferables&&s[o].getTransferables(f);(!u||!Array.isArray(u)||!u.length)&&(u=void 0),i(f,u)}catch(d){console.error(d),i(d)}}}function n(r,i){var a=void 0;self.troikaDefine=function(l){return a=l};var o=URL.createObjectURL(new Blob(["/** "+r.replace(/\*/g,"")+` **/

troikaDefine(
`+i+`
)`],{type:"application/javascript"}));try{importScripts(o)}catch(l){console.error(l)}return URL.revokeObjectURL(o),delete self.troikaDefine,a}self.addEventListener("message",function(r){var i=r.data,a=i.messageId,o=i.action,l=i.data;try{o==="registerModule"&&e(l,function(c){c instanceof Error?postMessage({messageId:a,success:!1,error:c.message}):postMessage({messageId:a,success:!0,result:{isCallable:typeof c=="function"}})}),o==="callModule"&&t(l,function(c,h){c instanceof Error?postMessage({messageId:a,success:!1,error:c.message}):postMessage({messageId:a,success:!0,result:c},h||void 0)})}catch(c){postMessage({messageId:a,success:!1,error:c.stack})}})}function A_(s){var e=function(){for(var t=[],n=arguments.length;n--;)t[n]=arguments[n];return e._getInitResult().then(function(r){if(typeof r=="function")return r.apply(void 0,t);throw new Error("Worker module function was called but `init` did not return a callable function")})};return e._getInitResult=function(){var t=s.dependencies,n=s.init;t=Array.isArray(t)?t.map(function(i){return i&&(i=i.onMainThread||i,i._getInitResult&&(i=i._getInitResult())),i}):[];var r=Promise.all(t).then(function(i){return n.apply(null,i)});return e._getInitResult=function(){return r},r},e}var nh=function(){var s=!1;if(typeof window<"u"&&typeof window.document<"u")try{var e=new Worker(URL.createObjectURL(new Blob([""],{type:"application/javascript"})));e.terminate(),s=!0}catch(t){console.log("Troika createWorkerModule: web workers not allowed; falling back to main thread execution. Cause: ["+t.message+"]")}return nh=function(){return s},s},C_=0,R_=0,va=!1,hr=Object.create(null),ur=Object.create(null),La=Object.create(null);function Gi(s){if((!s||typeof s.init!="function")&&!va)throw new Error("requires `options.init` function");var e=s.dependencies,t=s.init,n=s.getTransferables,r=s.workerId,i=A_(s);r==null&&(r="#default");var a="workerModule"+ ++C_,o=s.name||a,l=null;e=e&&e.map(function(h){return typeof h=="function"&&!h.workerModuleData&&(va=!0,h=Gi({workerId:r,name:"<"+o+"> function dependency: "+h.name,init:`function(){return (
`+ss(h)+`
)}`}),va=!1),h&&h.workerModuleData&&(h=h.workerModuleData),h});function c(){for(var h=[],f=arguments.length;f--;)h[f]=arguments[f];if(!nh())return i.apply(void 0,h);if(!l){l=Kl(r,"registerModule",c.workerModuleData);var u=function(){l=null,ur[r].delete(u)};(ur[r]||(ur[r]=new Set)).add(u)}return l.then(function(d){var g=d.isCallable;if(g)return Kl(r,"callModule",{id:a,args:h});throw new Error("Worker module function was called but `init` did not return a callable function")})}return c.workerModuleData={isWorkerModule:!0,id:a,name:o,dependencies:e,init:ss(t),getTransferables:n&&ss(n)},c.onMainThread=i,c}function P_(s){ur[s]&&ur[s].forEach(function(e){e()}),hr[s]&&(hr[s].terminate(),delete hr[s])}function ss(s){var e=s.toString();return!/^function/.test(e)&&/^\w+\s*\(/.test(e)&&(e="function "+e),e}function U_(s){var e=hr[s];if(!e){var t=ss(w_);e=hr[s]=new Worker(URL.createObjectURL(new Blob(["/** Worker Module Bootstrap: "+s.replace(/\*/g,"")+` **/

;(`+t+")()"],{type:"application/javascript"}))),e.onmessage=function(n){var r=n.data,i=r.messageId,a=La[i];if(!a)throw new Error("WorkerModule response with empty or unknown messageId");delete La[i],a(r)}}return e}function Kl(s,e,t){return new Promise(function(n,r){var i=++R_;La[i]=function(a){a.success?n(a.result):r(new Error("Error in worker "+e+" call: "+a.error))},U_(s).postMessage({messageId:i,action:e,data:t})})}function ih(){var s=function(e){function t(K,q,F,H,ne,O,B,te){var G=1-B;te.x=G*G*K+2*G*B*F+B*B*ne,te.y=G*G*q+2*G*B*H+B*B*O}function n(K,q,F,H,ne,O,B,te,G,oe){var pe=1-G;oe.x=pe*pe*pe*K+3*pe*pe*G*F+3*pe*G*G*ne+G*G*G*B,oe.y=pe*pe*pe*q+3*pe*pe*G*H+3*pe*G*G*O+G*G*G*te}function r(K,q){for(var F=/([MLQCZ])([^MLQCZ]*)/g,H,ne,O,B,te;H=F.exec(K);){var G=H[2].replace(/^\s*|\s*$/g,"").split(/[,\s]+/).map(function(oe){return parseFloat(oe)});switch(H[1]){case"M":B=ne=G[0],te=O=G[1];break;case"L":(G[0]!==B||G[1]!==te)&&q("L",B,te,B=G[0],te=G[1]);break;case"Q":{q("Q",B,te,B=G[2],te=G[3],G[0],G[1]);break}case"C":{q("C",B,te,B=G[4],te=G[5],G[0],G[1],G[2],G[3]);break}case"Z":(B!==ne||te!==O)&&q("L",B,te,ne,O);break}}}function i(K,q,F){F===void 0&&(F=16);var H={x:0,y:0};r(K,function(ne,O,B,te,G,oe,pe,ve,D){switch(ne){case"L":q(O,B,te,G);break;case"Q":{for(var he=O,Pe=B,Ue=1;Ue<F;Ue++)t(O,B,oe,pe,te,G,Ue/(F-1),H),q(he,Pe,H.x,H.y),he=H.x,Pe=H.y;break}case"C":{for(var de=O,ye=B,Me=1;Me<F;Me++)n(O,B,oe,pe,ve,D,te,G,Me/(F-1),H),q(de,ye,H.x,H.y),de=H.x,ye=H.y;break}}})}var a="precision highp float;attribute vec2 aUV;varying vec2 vUV;void main(){vUV=aUV;gl_Position=vec4(mix(vec2(-1.0),vec2(1.0),aUV),0.0,1.0);}",o="precision highp float;uniform sampler2D tex;varying vec2 vUV;void main(){gl_FragColor=texture2D(tex,vUV);}",l=new WeakMap,c={premultipliedAlpha:!1,preserveDrawingBuffer:!0,antialias:!1,depth:!1};function h(K,q){var F=K.getContext?K.getContext("webgl",c):K,H=l.get(F);if(!H){let pe=function(de){var ye=O[de];if(!ye&&(ye=O[de]=F.getExtension(de),!ye))throw new Error(de+" not supported");return ye},ve=function(de,ye){var Me=F.createShader(ye);return F.shaderSource(Me,de),F.compileShader(Me),Me},D=function(de,ye,Me,fe){if(!B[de]){var Ce={},C={},x=F.createProgram();F.attachShader(x,ve(ye,F.VERTEX_SHADER)),F.attachShader(x,ve(Me,F.FRAGMENT_SHADER)),F.linkProgram(x),B[de]={program:x,transaction:function(Z){F.useProgram(x),Z({setUniform:function(Q,Te){for(var le=[],ce=arguments.length-2;ce-- >0;)le[ce]=arguments[ce+2];var Se=C[Te]||(C[Te]=F.getUniformLocation(x,Te));F["uniform"+Q].apply(F,[Se].concat(le))},setAttribute:function(Q,Te,le,ce,Se){var ue=Ce[Q];ue||(ue=Ce[Q]={buf:F.createBuffer(),loc:F.getAttribLocation(x,Q),data:null}),F.bindBuffer(F.ARRAY_BUFFER,ue.buf),F.vertexAttribPointer(ue.loc,Te,F.FLOAT,!1,0,0),F.enableVertexAttribArray(ue.loc),ne?F.vertexAttribDivisor(ue.loc,ce):pe("ANGLE_instanced_arrays").vertexAttribDivisorANGLE(ue.loc,ce),Se!==ue.data&&(F.bufferData(F.ARRAY_BUFFER,Se,le),ue.data=Se)}})}}}B[de].transaction(fe)},he=function(de,ye){G++;try{F.activeTexture(F.TEXTURE0+G);var Me=te[de];Me||(Me=te[de]=F.createTexture(),F.bindTexture(F.TEXTURE_2D,Me),F.texParameteri(F.TEXTURE_2D,F.TEXTURE_MIN_FILTER,F.NEAREST),F.texParameteri(F.TEXTURE_2D,F.TEXTURE_MAG_FILTER,F.NEAREST)),F.bindTexture(F.TEXTURE_2D,Me),ye(Me,G)}finally{G--}},Pe=function(de,ye,Me){var fe=F.createFramebuffer();oe.push(fe),F.bindFramebuffer(F.FRAMEBUFFER,fe),F.activeTexture(F.TEXTURE0+ye),F.bindTexture(F.TEXTURE_2D,de),F.framebufferTexture2D(F.FRAMEBUFFER,F.COLOR_ATTACHMENT0,F.TEXTURE_2D,de,0);try{Me(fe)}finally{F.deleteFramebuffer(fe),F.bindFramebuffer(F.FRAMEBUFFER,oe[--oe.length-1]||null)}},Ue=function(){O={},B={},te={},G=-1,oe.length=0};var ne=typeof WebGL2RenderingContext<"u"&&F instanceof WebGL2RenderingContext,O={},B={},te={},G=-1,oe=[];F.canvas.addEventListener("webglcontextlost",function(de){Ue(),de.preventDefault()},!1),l.set(F,H={gl:F,isWebGL2:ne,getExtension:pe,withProgram:D,withTexture:he,withTextureFramebuffer:Pe,handleContextLoss:Ue})}q(H)}function f(K,q,F,H,ne,O,B,te){B===void 0&&(B=15),te===void 0&&(te=null),h(K,function(G){var oe=G.gl,pe=G.withProgram,ve=G.withTexture;ve("copy",function(D,he){oe.texImage2D(oe.TEXTURE_2D,0,oe.RGBA,ne,O,0,oe.RGBA,oe.UNSIGNED_BYTE,q),pe("copy",a,o,function(Pe){var Ue=Pe.setUniform,de=Pe.setAttribute;de("aUV",2,oe.STATIC_DRAW,0,new Float32Array([0,0,2,0,0,2])),Ue("1i","image",he),oe.bindFramebuffer(oe.FRAMEBUFFER,te||null),oe.disable(oe.BLEND),oe.colorMask(B&8,B&4,B&2,B&1),oe.viewport(F,H,ne,O),oe.scissor(F,H,ne,O),oe.drawArrays(oe.TRIANGLES,0,3)})})})}function u(K,q,F){var H=K.width,ne=K.height;h(K,function(O){var B=O.gl,te=new Uint8Array(H*ne*4);B.readPixels(0,0,H,ne,B.RGBA,B.UNSIGNED_BYTE,te),K.width=q,K.height=F,f(B,te,0,0,H,ne)})}var d=Object.freeze({__proto__:null,withWebGLContext:h,renderImageData:f,resizeWebGLCanvasWithoutClearing:u});function g(K,q,F,H,ne,O){O===void 0&&(O=1);var B=new Uint8Array(K*q),te=H[2]-H[0],G=H[3]-H[1],oe=[];i(F,function(de,ye,Me,fe){oe.push({x1:de,y1:ye,x2:Me,y2:fe,minX:Math.min(de,Me),minY:Math.min(ye,fe),maxX:Math.max(de,Me),maxY:Math.max(ye,fe)})}),oe.sort(function(de,ye){return de.maxX-ye.maxX});for(var pe=0;pe<K;pe++)for(var ve=0;ve<q;ve++){var D=Pe(H[0]+te*(pe+.5)/K,H[1]+G*(ve+.5)/q),he=Math.pow(1-Math.abs(D)/ne,O)/2;D<0&&(he=1-he),he=Math.max(0,Math.min(255,Math.round(he*255))),B[ve*K+pe]=he}return B;function Pe(de,ye){for(var Me=1/0,fe=1/0,Ce=oe.length;Ce--;){var C=oe[Ce];if(C.maxX+fe<=de)break;if(de+fe>C.minX&&ye-fe<C.maxY&&ye+fe>C.minY){var x=m(de,ye,C.x1,C.y1,C.x2,C.y2);x<Me&&(Me=x,fe=Math.sqrt(Me))}}return Ue(de,ye)&&(fe=-fe),fe}function Ue(de,ye){for(var Me=0,fe=oe.length;fe--;){var Ce=oe[fe];if(Ce.maxX<=de)break;var C=Ce.y1>ye!=Ce.y2>ye&&de<(Ce.x2-Ce.x1)*(ye-Ce.y1)/(Ce.y2-Ce.y1)+Ce.x1;C&&(Me+=Ce.y1<Ce.y2?1:-1)}return Me!==0}}function _(K,q,F,H,ne,O,B,te,G,oe){O===void 0&&(O=1),te===void 0&&(te=0),G===void 0&&(G=0),oe===void 0&&(oe=0),p(K,q,F,H,ne,O,B,null,te,G,oe)}function p(K,q,F,H,ne,O,B,te,G,oe,pe){O===void 0&&(O=1),G===void 0&&(G=0),oe===void 0&&(oe=0),pe===void 0&&(pe=0);for(var ve=g(K,q,F,H,ne,O),D=new Uint8Array(ve.length*4),he=0;he<ve.length;he++)D[he*4+pe]=ve[he];f(B,D,G,oe,K,q,1<<3-pe,te)}function m(K,q,F,H,ne,O){var B=ne-F,te=O-H,G=B*B+te*te,oe=G?Math.max(0,Math.min(1,((K-F)*B+(q-H)*te)/G)):0,pe=K-(F+oe*B),ve=q-(H+oe*te);return pe*pe+ve*ve}var M=Object.freeze({__proto__:null,generate:g,generateIntoCanvas:_,generateIntoFramebuffer:p}),v="precision highp float;uniform vec4 uGlyphBounds;attribute vec2 aUV;attribute vec4 aLineSegment;varying vec4 vLineSegment;varying vec2 vGlyphXY;void main(){vLineSegment=aLineSegment;vGlyphXY=mix(uGlyphBounds.xy,uGlyphBounds.zw,aUV);gl_Position=vec4(mix(vec2(-1.0),vec2(1.0),aUV),0.0,1.0);}",b="precision highp float;uniform vec4 uGlyphBounds;uniform float uMaxDistance;uniform float uExponent;varying vec4 vLineSegment;varying vec2 vGlyphXY;float absDistToSegment(vec2 point,vec2 lineA,vec2 lineB){vec2 lineDir=lineB-lineA;float lenSq=dot(lineDir,lineDir);float t=lenSq==0.0 ? 0.0 : clamp(dot(point-lineA,lineDir)/lenSq,0.0,1.0);vec2 linePt=lineA+t*lineDir;return distance(point,linePt);}void main(){vec4 seg=vLineSegment;vec2 p=vGlyphXY;float dist=absDistToSegment(p,seg.xy,seg.zw);float val=pow(1.0-clamp(dist/uMaxDistance,0.0,1.0),uExponent)*0.5;bool crossing=(seg.y>p.y!=seg.w>p.y)&&(p.x<(seg.z-seg.x)*(p.y-seg.y)/(seg.w-seg.y)+seg.x);bool crossingUp=crossing&&vLineSegment.y<vLineSegment.w;gl_FragColor=vec4(crossingUp ? 1.0/255.0 : 0.0,crossing&&!crossingUp ? 1.0/255.0 : 0.0,0.0,val);}",R="precision highp float;uniform sampler2D tex;varying vec2 vUV;void main(){vec4 color=texture2D(tex,vUV);bool inside=color.r!=color.g;float val=inside ? 1.0-color.a : color.a;gl_FragColor=vec4(val);}",w=new Float32Array([0,0,2,0,0,2]),T=null,P=!1,E={},y=new WeakMap;function L(K){if(!P&&!W(K))throw new Error("WebGL generation not supported")}function U(K,q,F,H,ne,O,B){if(O===void 0&&(O=1),B===void 0&&(B=null),!B&&(B=T,!B)){var te=typeof OffscreenCanvas=="function"?new OffscreenCanvas(1,1):typeof document<"u"?document.createElement("canvas"):null;if(!te)throw new Error("OffscreenCanvas or DOM canvas not supported");B=T=te.getContext("webgl",{depth:!1})}L(B);var G=new Uint8Array(K*q*4);h(B,function(D){var he=D.gl,Pe=D.withTexture,Ue=D.withTextureFramebuffer;Pe("readable",function(de,ye){he.texImage2D(he.TEXTURE_2D,0,he.RGBA,K,q,0,he.RGBA,he.UNSIGNED_BYTE,null),Ue(de,ye,function(Me){N(K,q,F,H,ne,O,he,Me,0,0,0),he.readPixels(0,0,K,q,he.RGBA,he.UNSIGNED_BYTE,G)})})});for(var oe=new Uint8Array(K*q),pe=0,ve=0;pe<G.length;pe+=4)oe[ve++]=G[pe];return oe}function I(K,q,F,H,ne,O,B,te,G,oe){O===void 0&&(O=1),te===void 0&&(te=0),G===void 0&&(G=0),oe===void 0&&(oe=0),N(K,q,F,H,ne,O,B,null,te,G,oe)}function N(K,q,F,H,ne,O,B,te,G,oe,pe){O===void 0&&(O=1),G===void 0&&(G=0),oe===void 0&&(oe=0),pe===void 0&&(pe=0),L(B);var ve=[];i(F,function(D,he,Pe,Ue){ve.push(D,he,Pe,Ue)}),ve=new Float32Array(ve),h(B,function(D){var he=D.gl,Pe=D.isWebGL2,Ue=D.getExtension,de=D.withProgram,ye=D.withTexture,Me=D.withTextureFramebuffer,fe=D.handleContextLoss;if(ye("rawDistances",function(Ce,C){(K!==Ce._lastWidth||q!==Ce._lastHeight)&&he.texImage2D(he.TEXTURE_2D,0,he.RGBA,Ce._lastWidth=K,Ce._lastHeight=q,0,he.RGBA,he.UNSIGNED_BYTE,null),de("main",v,b,function(x){var X=x.setAttribute,Z=x.setUniform,ie=!Pe&&Ue("ANGLE_instanced_arrays"),Q=!Pe&&Ue("EXT_blend_minmax");X("aUV",2,he.STATIC_DRAW,0,w),X("aLineSegment",4,he.DYNAMIC_DRAW,1,ve),Z.apply(void 0,["4f","uGlyphBounds"].concat(H)),Z("1f","uMaxDistance",ne),Z("1f","uExponent",O),Me(Ce,C,function(Te){he.enable(he.BLEND),he.colorMask(!0,!0,!0,!0),he.viewport(0,0,K,q),he.scissor(0,0,K,q),he.blendFunc(he.ONE,he.ONE),he.blendEquationSeparate(he.FUNC_ADD,Pe?he.MAX:Q.MAX_EXT),he.clear(he.COLOR_BUFFER_BIT),Pe?he.drawArraysInstanced(he.TRIANGLES,0,3,ve.length/4):ie.drawArraysInstancedANGLE(he.TRIANGLES,0,3,ve.length/4)})}),de("post",a,R,function(x){x.setAttribute("aUV",2,he.STATIC_DRAW,0,w),x.setUniform("1i","tex",C),he.bindFramebuffer(he.FRAMEBUFFER,te),he.disable(he.BLEND),he.colorMask(pe===0,pe===1,pe===2,pe===3),he.viewport(G,oe,K,q),he.scissor(G,oe,K,q),he.drawArrays(he.TRIANGLES,0,3)})}),he.isContextLost())throw fe(),new Error("webgl context lost")})}function W(K){var q=!K||K===T?E:K.canvas||K,F=y.get(q);if(F===void 0){P=!0;var H=null;try{var ne=[97,106,97,61,99,137,118,80,80,118,137,99,61,97,106,97],O=U(4,4,"M8,8L16,8L24,24L16,24Z",[0,0,32,32],24,1,K);F=O&&ne.length===O.length&&O.every(function(B,te){return B===ne[te]}),F||(H="bad trial run results",console.info(ne,O))}catch(B){F=!1,H=B.message}H&&console.warn("WebGL SDF generation not supported:",H),P=!1,y.set(q,F)}return F}var k=Object.freeze({__proto__:null,generate:U,generateIntoCanvas:I,generateIntoFramebuffer:N,isSupported:W});function se(K,q,F,H,ne,O){ne===void 0&&(ne=Math.max(H[2]-H[0],H[3]-H[1])/2),O===void 0&&(O=1);try{return U.apply(k,arguments)}catch(B){return console.info("WebGL SDF generation failed, falling back to JS",B),g.apply(M,arguments)}}function j(K,q,F,H,ne,O,B,te,G,oe){ne===void 0&&(ne=Math.max(H[2]-H[0],H[3]-H[1])/2),O===void 0&&(O=1),te===void 0&&(te=0),G===void 0&&(G=0),oe===void 0&&(oe=0);try{return I.apply(k,arguments)}catch(pe){return console.info("WebGL SDF generation failed, falling back to JS",pe),_.apply(M,arguments)}}return e.forEachPathCommand=r,e.generate=se,e.generateIntoCanvas=j,e.javascript=M,e.pathToLineSegments=i,e.webgl=k,e.webglUtils=d,Object.defineProperty(e,"__esModule",{value:!0}),e}({});return s}function D_(){var s=function(e){var t={R:"13k,1a,2,3,3,2+1j,ch+16,a+1,5+2,2+n,5,a,4,6+16,4+3,h+1b,4mo,179q,2+9,2+11,2i9+7y,2+68,4,3+4,5+13,4+3,2+4k,3+29,8+cf,1t+7z,w+17,3+3m,1t+3z,16o1+5r,8+30,8+mc,29+1r,29+4v,75+73",EN:"1c+9,3d+1,6,187+9,513,4+5,7+9,sf+j,175h+9,qw+q,161f+1d,4xt+a,25i+9",ES:"17,2,6dp+1,f+1,av,16vr,mx+1,4o,2",ET:"z+2,3h+3,b+1,ym,3e+1,2o,p4+1,8,6u,7c,g6,1wc,1n9+4,30+1b,2n,6d,qhx+1,h0m,a+1,49+2,63+1,4+1,6bb+3,12jj",AN:"16o+5,2j+9,2+1,35,ed,1ff2+9,87+u",CS:"18,2+1,b,2u,12k,55v,l,17v0,2,3,53,2+1,b",B:"a,3,f+2,2v,690",S:"9,2,k",WS:"c,k,4f4,1vk+a,u,1j,335",ON:"x+1,4+4,h+5,r+5,r+3,z,5+3,2+1,2+1,5,2+2,3+4,o,w,ci+1,8+d,3+d,6+8,2+g,39+1,9,6+1,2,33,b8,3+1,3c+1,7+1,5r,b,7h+3,sa+5,2,3i+6,jg+3,ur+9,2v,ij+1,9g+9,7+a,8m,4+1,49+x,14u,2+2,c+2,e+2,e+2,e+1,i+n,e+e,2+p,u+2,e+2,36+1,2+3,2+1,b,2+2,6+5,2,2,2,h+1,5+4,6+3,3+f,16+2,5+3l,3+81,1y+p,2+40,q+a,m+13,2r+ch,2+9e,75+hf,3+v,2+2w,6e+5,f+6,75+2a,1a+p,2+2g,d+5x,r+b,6+3,4+o,g,6+1,6+2,2k+1,4,2j,5h+z,1m+1,1e+f,t+2,1f+e,d+3,4o+3,2s+1,w,535+1r,h3l+1i,93+2,2s,b+1,3l+x,2v,4g+3,21+3,kz+1,g5v+1,5a,j+9,n+v,2,3,2+8,2+1,3+2,2,3,46+1,4+4,h+5,r+5,r+a,3h+2,4+6,b+4,78,1r+24,4+c,4,1hb,ey+6,103+j,16j+c,1ux+7,5+g,fsh,jdq+1t,4,57+2e,p1,1m,1m,1m,1m,4kt+1,7j+17,5+2r,d+e,3+e,2+e,2+10,m+4,w,1n+5,1q,4z+5,4b+rb,9+c,4+c,4+37,d+2g,8+b,l+b,5+1j,9+9,7+13,9+t,3+1,27+3c,2+29,2+3q,d+d,3+4,4+2,6+6,a+o,8+6,a+2,e+6,16+42,2+1i",BN:"0+8,6+d,2s+5,2+p,e,4m9,1kt+2,2b+5,5+5,17q9+v,7k,6p+8,6+1,119d+3,440+7,96s+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+75,6p+2rz,1ben+1,1ekf+1,1ekf+1",NSM:"lc+33,7o+6,7c+18,2,2+1,2+1,2,21+a,1d+k,h,2u+6,3+5,3+1,2+3,10,v+q,2k+a,1n+8,a,p+3,2+8,2+2,2+4,18+2,3c+e,2+v,1k,2,5+7,5,4+6,b+1,u,1n,5+3,9,l+1,r,3+1,1m,5+1,5+1,3+2,4,v+1,4,c+1,1m,5+4,2+1,5,l+1,n+5,2,1n,3,2+3,9,8+1,c+1,v,1q,d,1f,4,1m+2,6+2,2+3,8+1,c+1,u,1n,g+1,l+1,t+1,1m+1,5+3,9,l+1,u,21,8+2,2,2j,3+6,d+7,2r,3+8,c+5,23+1,s,2,2,1k+d,2+4,2+1,6+a,2+z,a,2v+3,2+5,2+1,3+1,q+1,5+2,h+3,e,3+1,7,g,jk+2,qb+2,u+2,u+1,v+1,1t+1,2+6,9,3+a,a,1a+2,3c+1,z,3b+2,5+1,a,7+2,64+1,3,1n,2+6,2,2,3+7,7+9,3,1d+g,1s+3,1d,2+4,2,6,15+8,d+1,x+3,3+1,2+2,1l,2+1,4,2+2,1n+7,3+1,49+2,2+c,2+6,5,7,4+1,5j+1l,2+4,k1+w,2db+2,3y,2p+v,ff+3,30+1,n9x+3,2+9,x+1,29+1,7l,4,5,q+1,6,48+1,r+h,e,13+7,q+a,1b+2,1d,3+3,3+1,14,1w+5,3+1,3+1,d,9,1c,1g,2+2,3+1,6+1,2,17+1,9,6n,3,5,fn5,ki+f,h+f,r2,6b,46+4,1af+2,2+1,6+3,15+2,5,4m+1,fy+3,as+1,4a+a,4x,1j+e,1l+2,1e+3,3+1,1y+2,11+4,2+7,1r,d+1,1h+8,b+3,3,2o+2,3,2+1,7,4h,4+7,m+1,1m+1,4,12+6,4+4,5g+7,3+2,2,o,2d+5,2,5+1,2+1,6n+3,7+1,2+1,s+1,2e+7,3,2+1,2z,2,3+5,2,2u+2,3+3,2+4,78+8,2+1,75+1,2,5,41+3,3+1,5,x+5,3+1,15+5,3+3,9,a+5,3+2,1b+c,2+1,bb+6,2+5,2d+l,3+6,2+1,2+1,3f+5,4,2+1,2+6,2,21+1,4,2,9o+1,f0c+4,1o+6,t5,1s+3,2a,f5l+1,43t+2,i+7,3+6,v+3,45+2,1j0+1i,5+1d,9,f,n+4,2+e,11t+6,2+g,3+6,2+1,2+4,7a+6,c6+3,15t+6,32+6,gzhy+6n",AL:"16w,3,2,e+1b,z+2,2+2s,g+1,8+1,b+m,2+t,s+2i,c+e,4h+f,1d+1e,1bwe+dp,3+3z,x+c,2+1,35+3y,2rm+z,5+7,b+5,dt+l,c+u,17nl+27,1t+27,4x+6n,3+d",LRO:"6ct",RLO:"6cu",LRE:"6cq",RLE:"6cr",PDF:"6cs",LRI:"6ee",RLI:"6ef",FSI:"6eg",PDI:"6eh"},n={},r={};n.L=1,r[1]="L",Object.keys(t).forEach(function(fe,Ce){n[fe]=1<<Ce+1,r[n[fe]]=fe}),Object.freeze(n);var i=n.LRI|n.RLI|n.FSI,a=n.L|n.R|n.AL,o=n.B|n.S|n.WS|n.ON|n.FSI|n.LRI|n.RLI|n.PDI,l=n.BN|n.RLE|n.LRE|n.RLO|n.LRO|n.PDF,c=n.S|n.WS|n.B|i|n.PDI|l,h=null;function f(){if(!h){h=new Map;var fe=function(C){if(t.hasOwnProperty(C)){var x=0;t[C].split(",").forEach(function(X){var Z=X.split("+"),ie=Z[0],Q=Z[1];ie=parseInt(ie,36),Q=Q?parseInt(Q,36):0,h.set(x+=ie,n[C]);for(var Te=0;Te<Q;Te++)h.set(++x,n[C])})}};for(var Ce in t)fe(Ce)}}function u(fe){return f(),h.get(fe.codePointAt(0))||n.L}function d(fe){return r[u(fe)]}var g={pairs:"14>1,1e>2,u>2,2wt>1,1>1,1ge>1,1wp>1,1j>1,f>1,hm>1,1>1,u>1,u6>1,1>1,+5,28>1,w>1,1>1,+3,b8>1,1>1,+3,1>3,-1>-1,3>1,1>1,+2,1s>1,1>1,x>1,th>1,1>1,+2,db>1,1>1,+3,3>1,1>1,+2,14qm>1,1>1,+1,4q>1,1e>2,u>2,2>1,+1",canonical:"6f1>-6dx,6dy>-6dx,6ec>-6ed,6ee>-6ed,6ww>2jj,-2ji>2jj,14r4>-1e7l,1e7m>-1e7l,1e7m>-1e5c,1e5d>-1e5b,1e5c>-14qx,14qy>-14qx,14vn>-1ecg,1ech>-1ecg,1edu>-1ecg,1eci>-1ecg,1eda>-1ecg,1eci>-1ecg,1eci>-168q,168r>-168q,168s>-14ye,14yf>-14ye"};function _(fe,Ce){var C=36,x=0,X=new Map,Z=Ce&&new Map,ie;return fe.split(",").forEach(function Q(Te){if(Te.indexOf("+")!==-1)for(var le=+Te;le--;)Q(ie);else{ie=Te;var ce=Te.split(">"),Se=ce[0],ue=ce[1];Se=String.fromCodePoint(x+=parseInt(Se,C)),ue=String.fromCodePoint(x+=parseInt(ue,C)),X.set(Se,ue),Ce&&Z.set(ue,Se)}}),{map:X,reverseMap:Z}}var p,m,M;function v(){if(!p){var fe=_(g.pairs,!0),Ce=fe.map,C=fe.reverseMap;p=Ce,m=C,M=_(g.canonical,!1).map}}function b(fe){return v(),p.get(fe)||null}function R(fe){return v(),m.get(fe)||null}function w(fe){return v(),M.get(fe)||null}var T=n.L,P=n.R,E=n.EN,y=n.ES,L=n.ET,U=n.AN,I=n.CS,N=n.B,W=n.S,k=n.ON,se=n.BN,j=n.NSM,K=n.AL,q=n.LRO,F=n.RLO,H=n.LRE,ne=n.RLE,O=n.PDF,B=n.LRI,te=n.RLI,G=n.FSI,oe=n.PDI;function pe(fe,Ce){for(var C=125,x=new Uint32Array(fe.length),X=0;X<fe.length;X++)x[X]=u(fe[X]);var Z=new Map;function ie(Pt,Zt){var Ut=x[Pt];x[Pt]=Zt,Z.set(Ut,Z.get(Ut)-1),Ut&o&&Z.set(o,Z.get(o)-1),Z.set(Zt,(Z.get(Zt)||0)+1),Zt&o&&Z.set(o,(Z.get(o)||0)+1)}for(var Q=new Uint8Array(fe.length),Te=new Map,le=[],ce=null,Se=0;Se<fe.length;Se++)ce||le.push(ce={start:Se,end:fe.length-1,level:Ce==="rtl"?1:Ce==="ltr"?0:ao(Se,!1)}),x[Se]&N&&(ce.end=Se,ce=null);for(var ue=ne|H|F|q|i|oe|O|N,be=function(Pt){return Pt+(Pt&1?1:2)},Be=function(Pt){return Pt+(Pt&1?2:1)},we=0;we<le.length;we++){ce=le[we];var me=[{_level:ce.level,_override:0,_isolate:0}],xe=void 0,Ne=0,Ve=0,S=0;Z.clear();for(var $=ce.start;$<=ce.end;$++){var z=x[$];if(xe=me[me.length-1],Z.set(z,(Z.get(z)||0)+1),z&o&&Z.set(o,(Z.get(o)||0)+1),z&ue)if(z&(ne|H)){Q[$]=xe._level;var ee=(z===ne?Be:be)(xe._level);ee<=C&&!Ne&&!Ve?me.push({_level:ee,_override:0,_isolate:0}):Ne||Ve++}else if(z&(F|q)){Q[$]=xe._level;var ge=(z===F?Be:be)(xe._level);ge<=C&&!Ne&&!Ve?me.push({_level:ge,_override:z&F?P:T,_isolate:0}):Ne||Ve++}else if(z&i){z&G&&(z=ao($+1,!0)===1?te:B),Q[$]=xe._level,xe._override&&ie($,xe._override);var Ae=(z===te?Be:be)(xe._level);Ae<=C&&Ne===0&&Ve===0?(S++,me.push({_level:Ae,_override:0,_isolate:1,_isolInitIndex:$})):Ne++}else if(z&oe){if(Ne>0)Ne--;else if(S>0){for(Ve=0;!me[me.length-1]._isolate;)me.pop();var Re=me[me.length-1]._isolInitIndex;Re!=null&&(Te.set(Re,$),Te.set($,Re)),me.pop(),S--}xe=me[me.length-1],Q[$]=xe._level,xe._override&&ie($,xe._override)}else z&O?(Ne===0&&(Ve>0?Ve--:!xe._isolate&&me.length>1&&(me.pop(),xe=me[me.length-1])),Q[$]=xe._level):z&N&&(Q[$]=ce.level);else Q[$]=xe._level,xe._override&&z!==se&&ie($,xe._override)}for(var je=[],We=null,Le=ce.start;Le<=ce.end;Le++){var Xe=x[Le];if(!(Xe&l)){var Je=Q[Le],tt=Xe&i,$e=Xe===oe;We&&Je===We._level?(We._end=Le,We._endsWithIsolInit=tt):je.push(We={_start:Le,_end:Le,_level:Je,_startsWithPDI:$e,_endsWithIsolInit:tt})}}for(var lt=[],St=0;St<je.length;St++){var gt=je[St];if(!gt._startsWithPDI||gt._startsWithPDI&&!Te.has(gt._start)){for(var qt=[We=gt],Gt=void 0;We&&We._endsWithIsolInit&&(Gt=Te.get(We._end))!=null;)for(var Ht=St+1;Ht<je.length;Ht++)if(je[Ht]._start===Gt){qt.push(We=je[Ht]);break}for(var dt=[],cn=0;cn<qt.length;cn++)for(var gr=qt[cn],Hi=gr._start;Hi<=gr._end;Hi++)dt.push(Hi);for(var A=Q[dt[0]],Y=ce.level,re=dt[0]-1;re>=0;re--)if(!(x[re]&l)){Y=Q[re];break}var ae=dt[dt.length-1],J=Q[ae],Ee=ce.level;if(!(x[ae]&i)){for(var Ie=ae+1;Ie<=ce.end;Ie++)if(!(x[Ie]&l)){Ee=Q[Ie];break}}lt.push({_seqIndices:dt,_sosType:Math.max(Y,A)%2?P:T,_eosType:Math.max(Ee,J)%2?P:T})}}for(var Fe=0;Fe<lt.length;Fe++){var ke=lt[Fe],_e=ke._seqIndices,Ge=ke._sosType,He=ke._eosType,Ze=Q[_e[0]]&1?P:T;if(Z.get(j))for(var rt=0;rt<_e.length;rt++){var st=_e[rt];if(x[st]&j){for(var _t=Ge,Qe=rt-1;Qe>=0;Qe--)if(!(x[_e[Qe]]&l)){_t=x[_e[Qe]];break}ie(st,_t&(i|oe)?k:_t)}}if(Z.get(E))for(var ze=0;ze<_e.length;ze++){var pt=_e[ze];if(x[pt]&E)for(var et=ze-1;et>=-1;et--){var Vt=et===-1?Ge:x[_e[et]];if(Vt&a){Vt===K&&ie(pt,U);break}}}if(Z.get(K))for(var Mn=0;Mn<_e.length;Mn++){var tn=_e[Mn];x[tn]&K&&ie(tn,P)}if(Z.get(y)||Z.get(I))for(var hn=1;hn<_e.length-1;hn++){var ot=_e[hn];if(x[ot]&(y|I)){for(var wt=0,kn=0,Mt=hn-1;Mt>=0&&(wt=x[_e[Mt]],!!(wt&l));Mt--);for(var zn=hn+1;zn<_e.length&&(kn=x[_e[zn]],!!(kn&l));zn++);wt===kn&&(x[ot]===y?wt===E:wt&(E|U))&&ie(ot,wt)}}if(Z.get(E))for(var Wt=0;Wt<_e.length;Wt++){var _r=_e[Wt];if(x[_r]&E){for(var vr=Wt-1;vr>=0&&x[_e[vr]]&(L|l);vr--)ie(_e[vr],E);for(Wt++;Wt<_e.length&&x[_e[Wt]]&(L|l|E);Wt++)x[_e[Wt]]!==E&&ie(_e[Wt],E)}}if(Z.get(L)||Z.get(y)||Z.get(I))for(var Vi=0;Vi<_e.length;Vi++){var ja=_e[Vi];if(x[ja]&(L|y|I)){ie(ja,k);for(var xr=Vi-1;xr>=0&&x[_e[xr]]&l;xr--)ie(_e[xr],k);for(var yr=Vi+1;yr<_e.length&&x[_e[yr]]&l;yr++)ie(_e[yr],k)}}if(Z.get(E))for(var ws=0,qa=Ge;ws<_e.length;ws++){var Ka=_e[ws],As=x[Ka];As&E?qa===T&&ie(Ka,T):As&a&&(qa=As)}if(Z.get(o)){var Wi=P|E|U,Za=Wi|T,Sr=[];{for(var ri=[],si=0;si<_e.length;si++)if(x[_e[si]]&o){var Xi=fe[_e[si]],Ja=void 0;if(b(Xi)!==null)if(ri.length<63)ri.push({char:Xi,seqIndex:si});else break;else if((Ja=R(Xi))!==null)for(var Yi=ri.length-1;Yi>=0;Yi--){var Cs=ri[Yi].char;if(Cs===Ja||Cs===R(w(Xi))||b(w(Cs))===Xi){Sr.push([ri[Yi].seqIndex,si]),ri.length=Yi;break}}}Sr.sort(function(Pt,Zt){return Pt[0]-Zt[0]})}for(var Rs=0;Rs<Sr.length;Rs++){for(var Qa=Sr[Rs],Mr=Qa[0],Ps=Qa[1],$a=!1,Kt=0,Us=Mr+1;Us<Ps;Us++){var eo=_e[Us];if(x[eo]&Za){$a=!0;var to=x[eo]&Wi?P:T;if(to===Ze){Kt=to;break}}}if($a&&!Kt){Kt=Ge;for(var Ds=Mr-1;Ds>=0;Ds--){var no=_e[Ds];if(x[no]&Za){var io=x[no]&Wi?P:T;io!==Ze?Kt=io:Kt=Ze;break}}}if(Kt){if(x[_e[Mr]]=x[_e[Ps]]=Kt,Kt!==Ze){for(var ji=Mr+1;ji<_e.length;ji++)if(!(x[_e[ji]]&l)){u(fe[_e[ji]])&j&&(x[_e[ji]]=Kt);break}}if(Kt!==Ze){for(var qi=Ps+1;qi<_e.length;qi++)if(!(x[_e[qi]]&l)){u(fe[_e[qi]])&j&&(x[_e[qi]]=Kt);break}}}}for(var bn=0;bn<_e.length;bn++)if(x[_e[bn]]&o){for(var ro=bn,Ls=bn,Is=Ge,Ki=bn-1;Ki>=0;Ki--)if(x[_e[Ki]]&l)ro=Ki;else{Is=x[_e[Ki]]&Wi?P:T;break}for(var so=He,Zi=bn+1;Zi<_e.length;Zi++)if(x[_e[Zi]]&(o|l))Ls=Zi;else{so=x[_e[Zi]]&Wi?P:T;break}for(var Fs=ro;Fs<=Ls;Fs++)x[_e[Fs]]=Is===so?Is:Ze;bn=Ls}}}for(var Nt=ce.start;Nt<=ce.end;Nt++){var dh=Q[Nt],br=x[Nt];if(dh&1?br&(T|E|U)&&Q[Nt]++:br&P?Q[Nt]++:br&(U|E)&&(Q[Nt]+=2),br&l&&(Q[Nt]=Nt===0?ce.level:Q[Nt-1]),Nt===ce.end||u(fe[Nt])&(W|N))for(var Er=Nt;Er>=0&&u(fe[Er])&c;Er--)Q[Er]=ce.level}}return{levels:Q,paragraphs:le};function ao(Pt,Zt){for(var Ut=Pt;Ut<fe.length;Ut++){var En=x[Ut];if(En&(P|K))return 1;if(En&(N|T)||Zt&&En===oe)return 0;if(En&i){var oo=ph(Ut);Ut=oo===-1?fe.length:oo}}return 0}function ph(Pt){for(var Zt=1,Ut=Pt+1;Ut<fe.length;Ut++){var En=x[Ut];if(En&N)break;if(En&oe){if(--Zt===0)return Ut}else En&i&&Zt++}return-1}}var ve="14>1,j>2,t>2,u>2,1a>g,2v3>1,1>1,1ge>1,1wd>1,b>1,1j>1,f>1,ai>3,-2>3,+1,8>1k0,-1jq>1y7,-1y6>1hf,-1he>1h6,-1h5>1ha,-1h8>1qi,-1pu>1,6>3u,-3s>7,6>1,1>1,f>1,1>1,+2,3>1,1>1,+13,4>1,1>1,6>1eo,-1ee>1,3>1mg,-1me>1mk,-1mj>1mi,-1mg>1mi,-1md>1,1>1,+2,1>10k,-103>1,1>1,4>1,5>1,1>1,+10,3>1,1>8,-7>8,+1,-6>7,+1,a>1,1>1,u>1,u6>1,1>1,+5,26>1,1>1,2>1,2>2,8>1,7>1,4>1,1>1,+5,b8>1,1>1,+3,1>3,-2>1,2>1,1>1,+2,c>1,3>1,1>1,+2,h>1,3>1,a>1,1>1,2>1,3>1,1>1,d>1,f>1,3>1,1a>1,1>1,6>1,7>1,13>1,k>1,1>1,+19,4>1,1>1,+2,2>1,1>1,+18,m>1,a>1,1>1,lk>1,1>1,4>1,2>1,f>1,3>1,1>1,+3,db>1,1>1,+3,3>1,1>1,+2,14qm>1,1>1,+1,6>1,4j>1,j>2,t>2,u>2,2>1,+1",D;function he(){if(!D){var fe=_(ve,!0),Ce=fe.map,C=fe.reverseMap;C.forEach(function(x,X){Ce.set(X,x)}),D=Ce}}function Pe(fe){return he(),D.get(fe)||null}function Ue(fe,Ce,C,x){var X=fe.length;C=Math.max(0,C==null?0:+C),x=Math.min(X-1,x==null?X-1:+x);for(var Z=new Map,ie=C;ie<=x;ie++)if(Ce[ie]&1){var Q=Pe(fe[ie]);Q!==null&&Z.set(ie,Q)}return Z}function de(fe,Ce,C,x){var X=fe.length;C=Math.max(0,C==null?0:+C),x=Math.min(X-1,x==null?X-1:+x);var Z=[];return Ce.paragraphs.forEach(function(ie){var Q=Math.max(C,ie.start),Te=Math.min(x,ie.end);if(Q<Te){for(var le=Ce.levels.slice(Q,Te+1),ce=Te;ce>=Q&&u(fe[ce])&c;ce--)le[ce]=ie.level;for(var Se=ie.level,ue=1/0,be=0;be<le.length;be++){var Be=le[be];Be>Se&&(Se=Be),Be<ue&&(ue=Be|1)}for(var we=Se;we>=ue;we--)for(var me=0;me<le.length;me++)if(le[me]>=we){for(var xe=me;me+1<le.length&&le[me+1]>=we;)me++;me>xe&&Z.push([xe+Q,me+Q])}}}),Z}function ye(fe,Ce,C,x){var X=Me(fe,Ce,C,x),Z=[].concat(fe);return X.forEach(function(ie,Q){Z[Q]=(Ce.levels[ie]&1?Pe(fe[ie]):null)||fe[ie]}),Z.join("")}function Me(fe,Ce,C,x){for(var X=de(fe,Ce,C,x),Z=[],ie=0;ie<fe.length;ie++)Z[ie]=ie;return X.forEach(function(Q){for(var Te=Q[0],le=Q[1],ce=Z.slice(Te,le+1),Se=ce.length;Se--;)Z[le-Se]=ce[Se]}),Z}return e.closingToOpeningBracket=R,e.getBidiCharType=u,e.getBidiCharTypeName=d,e.getCanonicalBracket=w,e.getEmbeddingLevels=pe,e.getMirroredCharacter=Pe,e.getMirroredCharactersMap=Ue,e.getReorderSegments=de,e.getReorderedIndices=Me,e.getReorderedString=ye,e.openingToClosingBracket=b,Object.defineProperty(e,"__esModule",{value:!0}),e}({});return s}const rh=/\bvoid\s+main\s*\(\s*\)\s*{/g;function Ia(s){const e=/^[ \t]*#include +<([\w\d./]+)>/gm;function t(n,r){let i=qe[r];return i?Ia(i):n}return s.replace(e,t)}const vt=[];for(let s=0;s<256;s++)vt[s]=(s<16?"0":"")+s.toString(16);function L_(){const s=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(vt[s&255]+vt[s>>8&255]+vt[s>>16&255]+vt[s>>24&255]+"-"+vt[e&255]+vt[e>>8&255]+"-"+vt[e>>16&15|64]+vt[e>>24&255]+"-"+vt[t&63|128]+vt[t>>8&255]+"-"+vt[t>>16&255]+vt[t>>24&255]+vt[n&255]+vt[n>>8&255]+vt[n>>16&255]+vt[n>>24&255]).toUpperCase()}const jn=Object.assign||function(){let s=arguments[0];for(let e=1,t=arguments.length;e<t;e++){let n=arguments[e];if(n)for(let r in n)Object.prototype.hasOwnProperty.call(n,r)&&(s[r]=n[r])}return s},I_=Date.now(),Zl=new WeakMap,Jl=new Map;let F_=1e10;function Fa(s,e){const t=k_(e);let n=Zl.get(s);if(n||Zl.set(s,n=Object.create(null)),n[t])return new n[t];const r=`_onBeforeCompile${t}`,i=function(c,h){s.onBeforeCompile.call(this,c,h);const f=this.customProgramCacheKey()+"|"+c.vertexShader+"|"+c.fragmentShader;let u=Jl[f];if(!u){const d=N_(this,c,e,t);u=Jl[f]=d}c.vertexShader=u.vertexShader,c.fragmentShader=u.fragmentShader,jn(c.uniforms,this.uniforms),e.timeUniform&&(c.uniforms[e.timeUniform]={get value(){return Date.now()-I_}}),this[r]&&this[r](c)},a=function(){return o(e.chained?s:s.clone())},o=function(c){const h=Object.create(c,l);return Object.defineProperty(h,"baseMaterial",{value:s}),Object.defineProperty(h,"id",{value:F_++}),h.uuid=L_(),h.uniforms=jn({},c.uniforms,e.uniforms),h.defines=jn({},c.defines,e.defines),h.defines[`TROIKA_DERIVED_MATERIAL_${t}`]="",h.extensions=jn({},c.extensions,e.extensions),h._listeners=void 0,h},l={constructor:{value:a},isDerivedMaterial:{value:!0},type:{get:()=>s.type,set:c=>{s.type=c}},isDerivedFrom:{writable:!0,configurable:!0,value:function(c){const h=this.baseMaterial;return c===h||h.isDerivedMaterial&&h.isDerivedFrom(c)||!1}},customProgramCacheKey:{writable:!0,configurable:!0,value:function(){return s.customProgramCacheKey()+"|"+t}},onBeforeCompile:{get(){return i},set(c){this[r]=c}},copy:{writable:!0,configurable:!0,value:function(c){return s.copy.call(this,c),!s.isShaderMaterial&&!s.isDerivedMaterial&&(jn(this.extensions,c.extensions),jn(this.defines,c.defines),jn(this.uniforms,fr.clone(c.uniforms))),this}},clone:{writable:!0,configurable:!0,value:function(){const c=new s.constructor;return o(c).copy(this)}},getDepthMaterial:{writable:!0,configurable:!0,value:function(){let c=this._depthMaterial;return c||(c=this._depthMaterial=Fa(s.isDerivedMaterial?s.getDepthMaterial():new Xc({depthPacking:Tc}),e),c.defines.IS_DEPTH_MATERIAL="",c.uniforms=this.uniforms),c}},getDistanceMaterial:{writable:!0,configurable:!0,value:function(){let c=this._distanceMaterial;return c||(c=this._distanceMaterial=Fa(s.isDerivedMaterial?s.getDistanceMaterial():new Yc,e),c.defines.IS_DISTANCE_MATERIAL="",c.uniforms=this.uniforms),c}},dispose:{writable:!0,configurable:!0,value(){const{_depthMaterial:c,_distanceMaterial:h}=this;c&&c.dispose(),h&&h.dispose(),s.dispose.call(this)}}};return n[t]=a,new a}function N_(s,{vertexShader:e,fragmentShader:t},n,r){let{vertexDefs:i,vertexMainIntro:a,vertexMainOutro:o,vertexTransform:l,fragmentDefs:c,fragmentMainIntro:h,fragmentMainOutro:f,fragmentColorTransform:u,customRewriter:d,timeUniform:g}=n;if(i=i||"",a=a||"",o=o||"",c=c||"",h=h||"",f=f||"",(l||d)&&(e=Ia(e)),(u||d)&&(t=t.replace(/^[ \t]*#include <((?:tonemapping|encodings|colorspace|fog|premultiplied_alpha|dithering)_fragment)>/gm,`
//!BEGIN_POST_CHUNK $1
$&
//!END_POST_CHUNK
`),t=Ia(t)),d){let _=d({vertexShader:e,fragmentShader:t});e=_.vertexShader,t=_.fragmentShader}if(u){let _=[];t=t.replace(/^\/\/!BEGIN_POST_CHUNK[^]+?^\/\/!END_POST_CHUNK/gm,p=>(_.push(p),"")),f=`${u}
${_.join(`
`)}
${f}`}if(g){const _=`
uniform float ${g};
`;i=_+i,c=_+c}return l&&(e=`vec3 troika_position_${r};
vec3 troika_normal_${r};
vec2 troika_uv_${r};
${e}
`,i=`${i}
void troikaVertexTransform${r}(inout vec3 position, inout vec3 normal, inout vec2 uv) {
  ${l}
}
`,a=`
troika_position_${r} = vec3(position);
troika_normal_${r} = vec3(normal);
troika_uv_${r} = vec2(uv);
troikaVertexTransform${r}(troika_position_${r}, troika_normal_${r}, troika_uv_${r});
${a}
`,e=e.replace(/\b(position|normal|uv)\b/g,(_,p,m,M)=>/\battribute\s+vec[23]\s+$/.test(M.substr(0,m))?p:`troika_${p}_${r}`),s.map&&s.map.channel>0||(e=e.replace(/\bMAP_UV\b/g,`troika_uv_${r}`))),e=Ql(e,r,i,a,o),t=Ql(t,r,c,h,f),{vertexShader:e,fragmentShader:t}}function Ql(s,e,t,n,r){return(n||r||t)&&(s=s.replace(rh,`
${t}
void troikaOrigMain${e}() {`),s+=`
void main() {
  ${n}
  troikaOrigMain${e}();
  ${r}
}`),s}function O_(s,e){return s==="uniforms"?void 0:typeof e=="function"?e.toString():e}let B_=0;const $l=new Map;function k_(s){const e=JSON.stringify(s,O_);let t=$l.get(e);return t==null&&$l.set(e,t=++B_),t}/*!
Custom build of Typr.ts (https://github.com/fredli74/Typr.ts) for use in Troika text rendering.
Original MIT license applies: https://github.com/fredli74/Typr.ts/blob/master/LICENSE
*/function z_(){return typeof window>"u"&&(self.window=self),function(s){var e={parse:function(r){var i=e._bin,a=new Uint8Array(r);if(i.readASCII(a,0,4)=="ttcf"){var o=4;i.readUshort(a,o),o+=2,i.readUshort(a,o),o+=2;var l=i.readUint(a,o);o+=4;for(var c=[],h=0;h<l;h++){var f=i.readUint(a,o);o+=4,c.push(e._readFont(a,f))}return c}return[e._readFont(a,0)]},_readFont:function(r,i){var a=e._bin,o=i;a.readFixed(r,i),i+=4;var l=a.readUshort(r,i);i+=2,a.readUshort(r,i),i+=2,a.readUshort(r,i),i+=2,a.readUshort(r,i),i+=2;for(var c=["cmap","head","hhea","maxp","hmtx","name","OS/2","post","loca","glyf","kern","CFF ","GDEF","GPOS","GSUB","SVG "],h={_data:r,_offset:o},f={},u=0;u<l;u++){var d=a.readASCII(r,i,4);i+=4,a.readUint(r,i),i+=4;var g=a.readUint(r,i);i+=4;var _=a.readUint(r,i);i+=4,f[d]={offset:g,length:_}}for(u=0;u<c.length;u++){var p=c[u];f[p]&&(h[p.trim()]=e[p.trim()].parse(r,f[p].offset,f[p].length,h))}return h},_tabOffset:function(r,i,a){for(var o=e._bin,l=o.readUshort(r,a+4),c=a+12,h=0;h<l;h++){var f=o.readASCII(r,c,4);c+=4,o.readUint(r,c),c+=4;var u=o.readUint(r,c);if(c+=4,o.readUint(r,c),c+=4,f==i)return u}return 0}};e._bin={readFixed:function(r,i){return(r[i]<<8|r[i+1])+(r[i+2]<<8|r[i+3])/65540},readF2dot14:function(r,i){return e._bin.readShort(r,i)/16384},readInt:function(r,i){return e._bin._view(r).getInt32(i)},readInt8:function(r,i){return e._bin._view(r).getInt8(i)},readShort:function(r,i){return e._bin._view(r).getInt16(i)},readUshort:function(r,i){return e._bin._view(r).getUint16(i)},readUshorts:function(r,i,a){for(var o=[],l=0;l<a;l++)o.push(e._bin.readUshort(r,i+2*l));return o},readUint:function(r,i){return e._bin._view(r).getUint32(i)},readUint64:function(r,i){return 4294967296*e._bin.readUint(r,i)+e._bin.readUint(r,i+4)},readASCII:function(r,i,a){for(var o="",l=0;l<a;l++)o+=String.fromCharCode(r[i+l]);return o},readUnicode:function(r,i,a){for(var o="",l=0;l<a;l++){var c=r[i++]<<8|r[i++];o+=String.fromCharCode(c)}return o},_tdec:typeof window<"u"&&window.TextDecoder?new window.TextDecoder:null,readUTF8:function(r,i,a){var o=e._bin._tdec;return o&&i==0&&a==r.length?o.decode(r):e._bin.readASCII(r,i,a)},readBytes:function(r,i,a){for(var o=[],l=0;l<a;l++)o.push(r[i+l]);return o},readASCIIArray:function(r,i,a){for(var o=[],l=0;l<a;l++)o.push(String.fromCharCode(r[i+l]));return o},_view:function(r){return r._dataView||(r._dataView=r.buffer?new DataView(r.buffer,r.byteOffset,r.byteLength):new DataView(new Uint8Array(r).buffer))}},e._lctf={},e._lctf.parse=function(r,i,a,o,l){var c=e._bin,h={},f=i;c.readFixed(r,i),i+=4;var u=c.readUshort(r,i);i+=2;var d=c.readUshort(r,i);i+=2;var g=c.readUshort(r,i);return i+=2,h.scriptList=e._lctf.readScriptList(r,f+u),h.featureList=e._lctf.readFeatureList(r,f+d),h.lookupList=e._lctf.readLookupList(r,f+g,l),h},e._lctf.readLookupList=function(r,i,a){var o=e._bin,l=i,c=[],h=o.readUshort(r,i);i+=2;for(var f=0;f<h;f++){var u=o.readUshort(r,i);i+=2;var d=e._lctf.readLookupTable(r,l+u,a);c.push(d)}return c},e._lctf.readLookupTable=function(r,i,a){var o=e._bin,l=i,c={tabs:[]};c.ltype=o.readUshort(r,i),i+=2,c.flag=o.readUshort(r,i),i+=2;var h=o.readUshort(r,i);i+=2;for(var f=c.ltype,u=0;u<h;u++){var d=o.readUshort(r,i);i+=2;var g=a(r,f,l+d,c);c.tabs.push(g)}return c},e._lctf.numOfOnes=function(r){for(var i=0,a=0;a<32;a++)r>>>a&1&&i++;return i},e._lctf.readClassDef=function(r,i){var a=e._bin,o=[],l=a.readUshort(r,i);if(i+=2,l==1){var c=a.readUshort(r,i);i+=2;var h=a.readUshort(r,i);i+=2;for(var f=0;f<h;f++)o.push(c+f),o.push(c+f),o.push(a.readUshort(r,i)),i+=2}if(l==2){var u=a.readUshort(r,i);for(i+=2,f=0;f<u;f++)o.push(a.readUshort(r,i)),i+=2,o.push(a.readUshort(r,i)),i+=2,o.push(a.readUshort(r,i)),i+=2}return o},e._lctf.getInterval=function(r,i){for(var a=0;a<r.length;a+=3){var o=r[a],l=r[a+1];if(r[a+2],o<=i&&i<=l)return a}return-1},e._lctf.readCoverage=function(r,i){var a=e._bin,o={};o.fmt=a.readUshort(r,i),i+=2;var l=a.readUshort(r,i);return i+=2,o.fmt==1&&(o.tab=a.readUshorts(r,i,l)),o.fmt==2&&(o.tab=a.readUshorts(r,i,3*l)),o},e._lctf.coverageIndex=function(r,i){var a=r.tab;if(r.fmt==1)return a.indexOf(i);if(r.fmt==2){var o=e._lctf.getInterval(a,i);if(o!=-1)return a[o+2]+(i-a[o])}return-1},e._lctf.readFeatureList=function(r,i){var a=e._bin,o=i,l=[],c=a.readUshort(r,i);i+=2;for(var h=0;h<c;h++){var f=a.readASCII(r,i,4);i+=4;var u=a.readUshort(r,i);i+=2;var d=e._lctf.readFeatureTable(r,o+u);d.tag=f.trim(),l.push(d)}return l},e._lctf.readFeatureTable=function(r,i){var a=e._bin,o=i,l={},c=a.readUshort(r,i);i+=2,c>0&&(l.featureParams=o+c);var h=a.readUshort(r,i);i+=2,l.tab=[];for(var f=0;f<h;f++)l.tab.push(a.readUshort(r,i+2*f));return l},e._lctf.readScriptList=function(r,i){var a=e._bin,o=i,l={},c=a.readUshort(r,i);i+=2;for(var h=0;h<c;h++){var f=a.readASCII(r,i,4);i+=4;var u=a.readUshort(r,i);i+=2,l[f.trim()]=e._lctf.readScriptTable(r,o+u)}return l},e._lctf.readScriptTable=function(r,i){var a=e._bin,o=i,l={},c=a.readUshort(r,i);i+=2,c>0&&(l.default=e._lctf.readLangSysTable(r,o+c));var h=a.readUshort(r,i);i+=2;for(var f=0;f<h;f++){var u=a.readASCII(r,i,4);i+=4;var d=a.readUshort(r,i);i+=2,l[u.trim()]=e._lctf.readLangSysTable(r,o+d)}return l},e._lctf.readLangSysTable=function(r,i){var a=e._bin,o={};a.readUshort(r,i),i+=2,o.reqFeature=a.readUshort(r,i),i+=2;var l=a.readUshort(r,i);return i+=2,o.features=a.readUshorts(r,i,l),o},e.CFF={},e.CFF.parse=function(r,i,a){var o=e._bin;(r=new Uint8Array(r.buffer,i,a))[i=0],r[++i],r[++i],r[++i],i++;var l=[];i=e.CFF.readIndex(r,i,l);for(var c=[],h=0;h<l.length-1;h++)c.push(o.readASCII(r,i+l[h],l[h+1]-l[h]));i+=l[l.length-1];var f=[];i=e.CFF.readIndex(r,i,f);var u=[];for(h=0;h<f.length-1;h++)u.push(e.CFF.readDict(r,i+f[h],i+f[h+1]));i+=f[f.length-1];var d=u[0],g=[];i=e.CFF.readIndex(r,i,g);var _=[];for(h=0;h<g.length-1;h++)_.push(o.readASCII(r,i+g[h],g[h+1]-g[h]));if(i+=g[g.length-1],e.CFF.readSubrs(r,i,d),d.CharStrings){i=d.CharStrings,g=[],i=e.CFF.readIndex(r,i,g);var p=[];for(h=0;h<g.length-1;h++)p.push(o.readBytes(r,i+g[h],g[h+1]-g[h]));d.CharStrings=p}if(d.ROS){i=d.FDArray;var m=[];for(i=e.CFF.readIndex(r,i,m),d.FDArray=[],h=0;h<m.length-1;h++){var M=e.CFF.readDict(r,i+m[h],i+m[h+1]);e.CFF._readFDict(r,M,_),d.FDArray.push(M)}i+=m[m.length-1],i=d.FDSelect,d.FDSelect=[];var v=r[i];if(i++,v!=3)throw v;var b=o.readUshort(r,i);for(i+=2,h=0;h<b+1;h++)d.FDSelect.push(o.readUshort(r,i),r[i+2]),i+=3}return d.Encoding&&(d.Encoding=e.CFF.readEncoding(r,d.Encoding,d.CharStrings.length)),d.charset&&(d.charset=e.CFF.readCharset(r,d.charset,d.CharStrings.length)),e.CFF._readFDict(r,d,_),d},e.CFF._readFDict=function(r,i,a){var o;for(var l in i.Private&&(o=i.Private[1],i.Private=e.CFF.readDict(r,o,o+i.Private[0]),i.Private.Subrs&&e.CFF.readSubrs(r,o+i.Private.Subrs,i.Private)),i)["FamilyName","FontName","FullName","Notice","version","Copyright"].indexOf(l)!=-1&&(i[l]=a[i[l]-426+35])},e.CFF.readSubrs=function(r,i,a){var o=e._bin,l=[];i=e.CFF.readIndex(r,i,l);var c,h=l.length;c=h<1240?107:h<33900?1131:32768,a.Bias=c,a.Subrs=[];for(var f=0;f<l.length-1;f++)a.Subrs.push(o.readBytes(r,i+l[f],l[f+1]-l[f]))},e.CFF.tableSE=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,0,111,112,113,114,0,115,116,117,118,119,120,121,122,0,123,0,124,125,126,127,128,129,130,131,0,132,133,0,134,135,136,137,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,138,0,139,0,0,0,0,140,141,142,143,0,0,0,0,0,144,0,0,0,145,0,0,146,147,148,149,0,0,0,0],e.CFF.glyphByUnicode=function(r,i){for(var a=0;a<r.charset.length;a++)if(r.charset[a]==i)return a;return-1},e.CFF.glyphBySE=function(r,i){return i<0||i>255?-1:e.CFF.glyphByUnicode(r,e.CFF.tableSE[i])},e.CFF.readEncoding=function(r,i,a){e._bin;var o=[".notdef"],l=r[i];if(i++,l!=0)throw"error: unknown encoding format: "+l;var c=r[i];i++;for(var h=0;h<c;h++)o.push(r[i+h]);return o},e.CFF.readCharset=function(r,i,a){var o=e._bin,l=[".notdef"],c=r[i];if(i++,c==0)for(var h=0;h<a;h++){var f=o.readUshort(r,i);i+=2,l.push(f)}else{if(c!=1&&c!=2)throw"error: format: "+c;for(;l.length<a;){f=o.readUshort(r,i),i+=2;var u=0;for(c==1?(u=r[i],i++):(u=o.readUshort(r,i),i+=2),h=0;h<=u;h++)l.push(f),f++}}return l},e.CFF.readIndex=function(r,i,a){var o=e._bin,l=o.readUshort(r,i)+1,c=r[i+=2];if(i++,c==1)for(var h=0;h<l;h++)a.push(r[i+h]);else if(c==2)for(h=0;h<l;h++)a.push(o.readUshort(r,i+2*h));else if(c==3)for(h=0;h<l;h++)a.push(16777215&o.readUint(r,i+3*h-1));else if(l!=1)throw"unsupported offset size: "+c+", count: "+l;return(i+=l*c)-1},e.CFF.getCharString=function(r,i,a){var o=e._bin,l=r[i],c=r[i+1];r[i+2],r[i+3],r[i+4];var h=1,f=null,u=null;l<=20&&(f=l,h=1),l==12&&(f=100*l+c,h=2),21<=l&&l<=27&&(f=l,h=1),l==28&&(u=o.readShort(r,i+1),h=3),29<=l&&l<=31&&(f=l,h=1),32<=l&&l<=246&&(u=l-139,h=1),247<=l&&l<=250&&(u=256*(l-247)+c+108,h=2),251<=l&&l<=254&&(u=256*-(l-251)-c-108,h=2),l==255&&(u=o.readInt(r,i+1)/65535,h=5),a.val=u??"o"+f,a.size=h},e.CFF.readCharString=function(r,i,a){for(var o=i+a,l=e._bin,c=[];i<o;){var h=r[i],f=r[i+1];r[i+2],r[i+3],r[i+4];var u=1,d=null,g=null;h<=20&&(d=h,u=1),h==12&&(d=100*h+f,u=2),h!=19&&h!=20||(d=h,u=2),21<=h&&h<=27&&(d=h,u=1),h==28&&(g=l.readShort(r,i+1),u=3),29<=h&&h<=31&&(d=h,u=1),32<=h&&h<=246&&(g=h-139,u=1),247<=h&&h<=250&&(g=256*(h-247)+f+108,u=2),251<=h&&h<=254&&(g=256*-(h-251)-f-108,u=2),h==255&&(g=l.readInt(r,i+1)/65535,u=5),c.push(g??"o"+d),i+=u}return c},e.CFF.readDict=function(r,i,a){for(var o=e._bin,l={},c=[];i<a;){var h=r[i],f=r[i+1];r[i+2],r[i+3],r[i+4];var u=1,d=null,g=null;if(h==28&&(g=o.readShort(r,i+1),u=3),h==29&&(g=o.readInt(r,i+1),u=5),32<=h&&h<=246&&(g=h-139,u=1),247<=h&&h<=250&&(g=256*(h-247)+f+108,u=2),251<=h&&h<=254&&(g=256*-(h-251)-f-108,u=2),h==255)throw g=o.readInt(r,i+1)/65535,u=5,"unknown number";if(h==30){var _=[];for(u=1;;){var p=r[i+u];u++;var m=p>>4,M=15&p;if(m!=15&&_.push(m),M!=15&&_.push(M),M==15)break}for(var v="",b=[0,1,2,3,4,5,6,7,8,9,".","e","e-","reserved","-","endOfNumber"],R=0;R<_.length;R++)v+=b[_[R]];g=parseFloat(v)}h<=21&&(d=["version","Notice","FullName","FamilyName","Weight","FontBBox","BlueValues","OtherBlues","FamilyBlues","FamilyOtherBlues","StdHW","StdVW","escape","UniqueID","XUID","charset","Encoding","CharStrings","Private","Subrs","defaultWidthX","nominalWidthX"][h],u=1,h==12&&(d=["Copyright","isFixedPitch","ItalicAngle","UnderlinePosition","UnderlineThickness","PaintType","CharstringType","FontMatrix","StrokeWidth","BlueScale","BlueShift","BlueFuzz","StemSnapH","StemSnapV","ForceBold",0,0,"LanguageGroup","ExpansionFactor","initialRandomSeed","SyntheticBase","PostScript","BaseFontName","BaseFontBlend",0,0,0,0,0,0,"ROS","CIDFontVersion","CIDFontRevision","CIDFontType","CIDCount","UIDBase","FDArray","FDSelect","FontName"][f],u=2)),d!=null?(l[d]=c.length==1?c[0]:c,c=[]):c.push(g),i+=u}return l},e.cmap={},e.cmap.parse=function(r,i,a){r=new Uint8Array(r.buffer,i,a),i=0;var o=e._bin,l={};o.readUshort(r,i),i+=2;var c=o.readUshort(r,i);i+=2;var h=[];l.tables=[];for(var f=0;f<c;f++){var u=o.readUshort(r,i);i+=2;var d=o.readUshort(r,i);i+=2;var g=o.readUint(r,i);i+=4;var _="p"+u+"e"+d,p=h.indexOf(g);if(p==-1){var m;p=l.tables.length,h.push(g);var M=o.readUshort(r,g);M==0?m=e.cmap.parse0(r,g):M==4?m=e.cmap.parse4(r,g):M==6?m=e.cmap.parse6(r,g):M==12?m=e.cmap.parse12(r,g):console.debug("unknown format: "+M,u,d,g),l.tables.push(m)}if(l[_]!=null)throw"multiple tables for one platform+encoding";l[_]=p}return l},e.cmap.parse0=function(r,i){var a=e._bin,o={};o.format=a.readUshort(r,i),i+=2;var l=a.readUshort(r,i);i+=2,a.readUshort(r,i),i+=2,o.map=[];for(var c=0;c<l-6;c++)o.map.push(r[i+c]);return o},e.cmap.parse4=function(r,i){var a=e._bin,o=i,l={};l.format=a.readUshort(r,i),i+=2;var c=a.readUshort(r,i);i+=2,a.readUshort(r,i),i+=2;var h=a.readUshort(r,i);i+=2;var f=h/2;l.searchRange=a.readUshort(r,i),i+=2,l.entrySelector=a.readUshort(r,i),i+=2,l.rangeShift=a.readUshort(r,i),i+=2,l.endCount=a.readUshorts(r,i,f),i+=2*f,i+=2,l.startCount=a.readUshorts(r,i,f),i+=2*f,l.idDelta=[];for(var u=0;u<f;u++)l.idDelta.push(a.readShort(r,i)),i+=2;for(l.idRangeOffset=a.readUshorts(r,i,f),i+=2*f,l.glyphIdArray=[];i<o+c;)l.glyphIdArray.push(a.readUshort(r,i)),i+=2;return l},e.cmap.parse6=function(r,i){var a=e._bin,o={};o.format=a.readUshort(r,i),i+=2,a.readUshort(r,i),i+=2,a.readUshort(r,i),i+=2,o.firstCode=a.readUshort(r,i),i+=2;var l=a.readUshort(r,i);i+=2,o.glyphIdArray=[];for(var c=0;c<l;c++)o.glyphIdArray.push(a.readUshort(r,i)),i+=2;return o},e.cmap.parse12=function(r,i){var a=e._bin,o={};o.format=a.readUshort(r,i),i+=2,i+=2,a.readUint(r,i),i+=4,a.readUint(r,i),i+=4;var l=a.readUint(r,i);i+=4,o.groups=[];for(var c=0;c<l;c++){var h=i+12*c,f=a.readUint(r,h+0),u=a.readUint(r,h+4),d=a.readUint(r,h+8);o.groups.push([f,u,d])}return o},e.glyf={},e.glyf.parse=function(r,i,a,o){for(var l=[],c=0;c<o.maxp.numGlyphs;c++)l.push(null);return l},e.glyf._parseGlyf=function(r,i){var a=e._bin,o=r._data,l=e._tabOffset(o,"glyf",r._offset)+r.loca[i];if(r.loca[i]==r.loca[i+1])return null;var c={};if(c.noc=a.readShort(o,l),l+=2,c.xMin=a.readShort(o,l),l+=2,c.yMin=a.readShort(o,l),l+=2,c.xMax=a.readShort(o,l),l+=2,c.yMax=a.readShort(o,l),l+=2,c.xMin>=c.xMax||c.yMin>=c.yMax)return null;if(c.noc>0){c.endPts=[];for(var h=0;h<c.noc;h++)c.endPts.push(a.readUshort(o,l)),l+=2;var f=a.readUshort(o,l);if(l+=2,o.length-l<f)return null;c.instructions=a.readBytes(o,l,f),l+=f;var u=c.endPts[c.noc-1]+1;for(c.flags=[],h=0;h<u;h++){var d=o[l];if(l++,c.flags.push(d),(8&d)!=0){var g=o[l];l++;for(var _=0;_<g;_++)c.flags.push(d),h++}}for(c.xs=[],h=0;h<u;h++){var p=(2&c.flags[h])!=0,m=(16&c.flags[h])!=0;p?(c.xs.push(m?o[l]:-o[l]),l++):m?c.xs.push(0):(c.xs.push(a.readShort(o,l)),l+=2)}for(c.ys=[],h=0;h<u;h++)p=(4&c.flags[h])!=0,m=(32&c.flags[h])!=0,p?(c.ys.push(m?o[l]:-o[l]),l++):m?c.ys.push(0):(c.ys.push(a.readShort(o,l)),l+=2);var M=0,v=0;for(h=0;h<u;h++)M+=c.xs[h],v+=c.ys[h],c.xs[h]=M,c.ys[h]=v}else{var b;c.parts=[];do{b=a.readUshort(o,l),l+=2;var R={m:{a:1,b:0,c:0,d:1,tx:0,ty:0},p1:-1,p2:-1};if(c.parts.push(R),R.glyphIndex=a.readUshort(o,l),l+=2,1&b){var w=a.readShort(o,l);l+=2;var T=a.readShort(o,l);l+=2}else w=a.readInt8(o,l),l++,T=a.readInt8(o,l),l++;2&b?(R.m.tx=w,R.m.ty=T):(R.p1=w,R.p2=T),8&b?(R.m.a=R.m.d=a.readF2dot14(o,l),l+=2):64&b?(R.m.a=a.readF2dot14(o,l),l+=2,R.m.d=a.readF2dot14(o,l),l+=2):128&b&&(R.m.a=a.readF2dot14(o,l),l+=2,R.m.b=a.readF2dot14(o,l),l+=2,R.m.c=a.readF2dot14(o,l),l+=2,R.m.d=a.readF2dot14(o,l),l+=2)}while(32&b);if(256&b){var P=a.readUshort(o,l);for(l+=2,c.instr=[],h=0;h<P;h++)c.instr.push(o[l]),l++}}return c},e.GDEF={},e.GDEF.parse=function(r,i,a,o){var l=i;i+=4;var c=e._bin.readUshort(r,i);return{glyphClassDef:c===0?null:e._lctf.readClassDef(r,l+c)}},e.GPOS={},e.GPOS.parse=function(r,i,a,o){return e._lctf.parse(r,i,a,o,e.GPOS.subt)},e.GPOS.subt=function(r,i,a,o){var l=e._bin,c=a,h={};if(h.fmt=l.readUshort(r,a),a+=2,i==1||i==2||i==3||i==7||i==8&&h.fmt<=2){var f=l.readUshort(r,a);a+=2,h.coverage=e._lctf.readCoverage(r,f+c)}if(i==1&&h.fmt==1){var u=l.readUshort(r,a);a+=2,u!=0&&(h.pos=e.GPOS.readValueRecord(r,a,u))}else if(i==2&&h.fmt>=1&&h.fmt<=2){u=l.readUshort(r,a),a+=2;var d=l.readUshort(r,a);a+=2;var g=e._lctf.numOfOnes(u),_=e._lctf.numOfOnes(d);if(h.fmt==1){h.pairsets=[];var p=l.readUshort(r,a);a+=2;for(var m=0;m<p;m++){var M=c+l.readUshort(r,a);a+=2;var v=l.readUshort(r,M);M+=2;for(var b=[],R=0;R<v;R++){var w=l.readUshort(r,M);M+=2,u!=0&&(U=e.GPOS.readValueRecord(r,M,u),M+=2*g),d!=0&&(I=e.GPOS.readValueRecord(r,M,d),M+=2*_),b.push({gid2:w,val1:U,val2:I})}h.pairsets.push(b)}}if(h.fmt==2){var T=l.readUshort(r,a);a+=2;var P=l.readUshort(r,a);a+=2;var E=l.readUshort(r,a);a+=2;var y=l.readUshort(r,a);for(a+=2,h.classDef1=e._lctf.readClassDef(r,c+T),h.classDef2=e._lctf.readClassDef(r,c+P),h.matrix=[],m=0;m<E;m++){var L=[];for(R=0;R<y;R++){var U=null,I=null;u!=0&&(U=e.GPOS.readValueRecord(r,a,u),a+=2*g),d!=0&&(I=e.GPOS.readValueRecord(r,a,d),a+=2*_),L.push({val1:U,val2:I})}h.matrix.push(L)}}}else if(i==4&&h.fmt==1)h.markCoverage=e._lctf.readCoverage(r,l.readUshort(r,a)+c),h.baseCoverage=e._lctf.readCoverage(r,l.readUshort(r,a+2)+c),h.markClassCount=l.readUshort(r,a+4),h.markArray=e.GPOS.readMarkArray(r,l.readUshort(r,a+6)+c),h.baseArray=e.GPOS.readBaseArray(r,l.readUshort(r,a+8)+c,h.markClassCount);else if(i==6&&h.fmt==1)h.mark1Coverage=e._lctf.readCoverage(r,l.readUshort(r,a)+c),h.mark2Coverage=e._lctf.readCoverage(r,l.readUshort(r,a+2)+c),h.markClassCount=l.readUshort(r,a+4),h.mark1Array=e.GPOS.readMarkArray(r,l.readUshort(r,a+6)+c),h.mark2Array=e.GPOS.readBaseArray(r,l.readUshort(r,a+8)+c,h.markClassCount);else{if(i==9&&h.fmt==1){var N=l.readUshort(r,a);a+=2;var W=l.readUint(r,a);if(a+=4,o.ltype==9)o.ltype=N;else if(o.ltype!=N)throw"invalid extension substitution";return e.GPOS.subt(r,o.ltype,c+W)}console.debug("unsupported GPOS table LookupType",i,"format",h.fmt)}return h},e.GPOS.readValueRecord=function(r,i,a){var o=e._bin,l=[];return l.push(1&a?o.readShort(r,i):0),i+=1&a?2:0,l.push(2&a?o.readShort(r,i):0),i+=2&a?2:0,l.push(4&a?o.readShort(r,i):0),i+=4&a?2:0,l.push(8&a?o.readShort(r,i):0),i+=8&a?2:0,l},e.GPOS.readBaseArray=function(r,i,a){var o=e._bin,l=[],c=i,h=o.readUshort(r,i);i+=2;for(var f=0;f<h;f++){for(var u=[],d=0;d<a;d++)u.push(e.GPOS.readAnchorRecord(r,c+o.readUshort(r,i))),i+=2;l.push(u)}return l},e.GPOS.readMarkArray=function(r,i){var a=e._bin,o=[],l=i,c=a.readUshort(r,i);i+=2;for(var h=0;h<c;h++){var f=e.GPOS.readAnchorRecord(r,a.readUshort(r,i+2)+l);f.markClass=a.readUshort(r,i),o.push(f),i+=4}return o},e.GPOS.readAnchorRecord=function(r,i){var a=e._bin,o={};return o.fmt=a.readUshort(r,i),o.x=a.readShort(r,i+2),o.y=a.readShort(r,i+4),o},e.GSUB={},e.GSUB.parse=function(r,i,a,o){return e._lctf.parse(r,i,a,o,e.GSUB.subt)},e.GSUB.subt=function(r,i,a,o){var l=e._bin,c=a,h={};if(h.fmt=l.readUshort(r,a),a+=2,i!=1&&i!=2&&i!=4&&i!=5&&i!=6)return null;if(i==1||i==2||i==4||i==5&&h.fmt<=2||i==6&&h.fmt<=2){var f=l.readUshort(r,a);a+=2,h.coverage=e._lctf.readCoverage(r,c+f)}if(i==1&&h.fmt>=1&&h.fmt<=2){if(h.fmt==1)h.delta=l.readShort(r,a),a+=2;else if(h.fmt==2){var u=l.readUshort(r,a);a+=2,h.newg=l.readUshorts(r,a,u),a+=2*h.newg.length}}else if(i==2&&h.fmt==1){u=l.readUshort(r,a),a+=2,h.seqs=[];for(var d=0;d<u;d++){var g=l.readUshort(r,a)+c;a+=2;var _=l.readUshort(r,g);h.seqs.push(l.readUshorts(r,g+2,_))}}else if(i==4)for(h.vals=[],u=l.readUshort(r,a),a+=2,d=0;d<u;d++){var p=l.readUshort(r,a);a+=2,h.vals.push(e.GSUB.readLigatureSet(r,c+p))}else if(i==5&&h.fmt==2){if(h.fmt==2){var m=l.readUshort(r,a);a+=2,h.cDef=e._lctf.readClassDef(r,c+m),h.scset=[];var M=l.readUshort(r,a);for(a+=2,d=0;d<M;d++){var v=l.readUshort(r,a);a+=2,h.scset.push(v==0?null:e.GSUB.readSubClassSet(r,c+v))}}}else if(i==6&&h.fmt==3){if(h.fmt==3){for(d=0;d<3;d++){u=l.readUshort(r,a),a+=2;for(var b=[],R=0;R<u;R++)b.push(e._lctf.readCoverage(r,c+l.readUshort(r,a+2*R)));a+=2*u,d==0&&(h.backCvg=b),d==1&&(h.inptCvg=b),d==2&&(h.ahedCvg=b)}u=l.readUshort(r,a),a+=2,h.lookupRec=e.GSUB.readSubstLookupRecords(r,a,u)}}else{if(i==7&&h.fmt==1){var w=l.readUshort(r,a);a+=2;var T=l.readUint(r,a);if(a+=4,o.ltype==9)o.ltype=w;else if(o.ltype!=w)throw"invalid extension substitution";return e.GSUB.subt(r,o.ltype,c+T)}console.debug("unsupported GSUB table LookupType",i,"format",h.fmt)}return h},e.GSUB.readSubClassSet=function(r,i){var a=e._bin.readUshort,o=i,l=[],c=a(r,i);i+=2;for(var h=0;h<c;h++){var f=a(r,i);i+=2,l.push(e.GSUB.readSubClassRule(r,o+f))}return l},e.GSUB.readSubClassRule=function(r,i){var a=e._bin.readUshort,o={},l=a(r,i),c=a(r,i+=2);i+=2,o.input=[];for(var h=0;h<l-1;h++)o.input.push(a(r,i)),i+=2;return o.substLookupRecords=e.GSUB.readSubstLookupRecords(r,i,c),o},e.GSUB.readSubstLookupRecords=function(r,i,a){for(var o=e._bin.readUshort,l=[],c=0;c<a;c++)l.push(o(r,i),o(r,i+2)),i+=4;return l},e.GSUB.readChainSubClassSet=function(r,i){var a=e._bin,o=i,l=[],c=a.readUshort(r,i);i+=2;for(var h=0;h<c;h++){var f=a.readUshort(r,i);i+=2,l.push(e.GSUB.readChainSubClassRule(r,o+f))}return l},e.GSUB.readChainSubClassRule=function(r,i){for(var a=e._bin,o={},l=["backtrack","input","lookahead"],c=0;c<l.length;c++){var h=a.readUshort(r,i);i+=2,c==1&&h--,o[l[c]]=a.readUshorts(r,i,h),i+=2*o[l[c]].length}return h=a.readUshort(r,i),i+=2,o.subst=a.readUshorts(r,i,2*h),i+=2*o.subst.length,o},e.GSUB.readLigatureSet=function(r,i){var a=e._bin,o=i,l=[],c=a.readUshort(r,i);i+=2;for(var h=0;h<c;h++){var f=a.readUshort(r,i);i+=2,l.push(e.GSUB.readLigature(r,o+f))}return l},e.GSUB.readLigature=function(r,i){var a=e._bin,o={chain:[]};o.nglyph=a.readUshort(r,i),i+=2;var l=a.readUshort(r,i);i+=2;for(var c=0;c<l-1;c++)o.chain.push(a.readUshort(r,i)),i+=2;return o},e.head={},e.head.parse=function(r,i,a){var o=e._bin,l={};return o.readFixed(r,i),i+=4,l.fontRevision=o.readFixed(r,i),i+=4,o.readUint(r,i),i+=4,o.readUint(r,i),i+=4,l.flags=o.readUshort(r,i),i+=2,l.unitsPerEm=o.readUshort(r,i),i+=2,l.created=o.readUint64(r,i),i+=8,l.modified=o.readUint64(r,i),i+=8,l.xMin=o.readShort(r,i),i+=2,l.yMin=o.readShort(r,i),i+=2,l.xMax=o.readShort(r,i),i+=2,l.yMax=o.readShort(r,i),i+=2,l.macStyle=o.readUshort(r,i),i+=2,l.lowestRecPPEM=o.readUshort(r,i),i+=2,l.fontDirectionHint=o.readShort(r,i),i+=2,l.indexToLocFormat=o.readShort(r,i),i+=2,l.glyphDataFormat=o.readShort(r,i),i+=2,l},e.hhea={},e.hhea.parse=function(r,i,a){var o=e._bin,l={};return o.readFixed(r,i),i+=4,l.ascender=o.readShort(r,i),i+=2,l.descender=o.readShort(r,i),i+=2,l.lineGap=o.readShort(r,i),i+=2,l.advanceWidthMax=o.readUshort(r,i),i+=2,l.minLeftSideBearing=o.readShort(r,i),i+=2,l.minRightSideBearing=o.readShort(r,i),i+=2,l.xMaxExtent=o.readShort(r,i),i+=2,l.caretSlopeRise=o.readShort(r,i),i+=2,l.caretSlopeRun=o.readShort(r,i),i+=2,l.caretOffset=o.readShort(r,i),i+=2,i+=8,l.metricDataFormat=o.readShort(r,i),i+=2,l.numberOfHMetrics=o.readUshort(r,i),i+=2,l},e.hmtx={},e.hmtx.parse=function(r,i,a,o){for(var l=e._bin,c={aWidth:[],lsBearing:[]},h=0,f=0,u=0;u<o.maxp.numGlyphs;u++)u<o.hhea.numberOfHMetrics&&(h=l.readUshort(r,i),i+=2,f=l.readShort(r,i),i+=2),c.aWidth.push(h),c.lsBearing.push(f);return c},e.kern={},e.kern.parse=function(r,i,a,o){var l=e._bin,c=l.readUshort(r,i);if(i+=2,c==1)return e.kern.parseV1(r,i-2,a,o);var h=l.readUshort(r,i);i+=2;for(var f={glyph1:[],rval:[]},u=0;u<h;u++){i+=2,a=l.readUshort(r,i),i+=2;var d=l.readUshort(r,i);i+=2;var g=d>>>8;if((g&=15)!=0)throw"unknown kern table format: "+g;i=e.kern.readFormat0(r,i,f)}return f},e.kern.parseV1=function(r,i,a,o){var l=e._bin;l.readFixed(r,i),i+=4;var c=l.readUint(r,i);i+=4;for(var h={glyph1:[],rval:[]},f=0;f<c;f++){l.readUint(r,i),i+=4;var u=l.readUshort(r,i);i+=2,l.readUshort(r,i),i+=2;var d=u>>>8;if((d&=15)!=0)throw"unknown kern table format: "+d;i=e.kern.readFormat0(r,i,h)}return h},e.kern.readFormat0=function(r,i,a){var o=e._bin,l=-1,c=o.readUshort(r,i);i+=2,o.readUshort(r,i),i+=2,o.readUshort(r,i),i+=2,o.readUshort(r,i),i+=2;for(var h=0;h<c;h++){var f=o.readUshort(r,i);i+=2;var u=o.readUshort(r,i);i+=2;var d=o.readShort(r,i);i+=2,f!=l&&(a.glyph1.push(f),a.rval.push({glyph2:[],vals:[]}));var g=a.rval[a.rval.length-1];g.glyph2.push(u),g.vals.push(d),l=f}return i},e.loca={},e.loca.parse=function(r,i,a,o){var l=e._bin,c=[],h=o.head.indexToLocFormat,f=o.maxp.numGlyphs+1;if(h==0)for(var u=0;u<f;u++)c.push(l.readUshort(r,i+(u<<1))<<1);if(h==1)for(u=0;u<f;u++)c.push(l.readUint(r,i+(u<<2)));return c},e.maxp={},e.maxp.parse=function(r,i,a){var o=e._bin,l={},c=o.readUint(r,i);return i+=4,l.numGlyphs=o.readUshort(r,i),i+=2,c==65536&&(l.maxPoints=o.readUshort(r,i),i+=2,l.maxContours=o.readUshort(r,i),i+=2,l.maxCompositePoints=o.readUshort(r,i),i+=2,l.maxCompositeContours=o.readUshort(r,i),i+=2,l.maxZones=o.readUshort(r,i),i+=2,l.maxTwilightPoints=o.readUshort(r,i),i+=2,l.maxStorage=o.readUshort(r,i),i+=2,l.maxFunctionDefs=o.readUshort(r,i),i+=2,l.maxInstructionDefs=o.readUshort(r,i),i+=2,l.maxStackElements=o.readUshort(r,i),i+=2,l.maxSizeOfInstructions=o.readUshort(r,i),i+=2,l.maxComponentElements=o.readUshort(r,i),i+=2,l.maxComponentDepth=o.readUshort(r,i),i+=2),l},e.name={},e.name.parse=function(r,i,a){var o=e._bin,l={};o.readUshort(r,i),i+=2;var c=o.readUshort(r,i);i+=2,o.readUshort(r,i);for(var h,f=["copyright","fontFamily","fontSubfamily","ID","fullName","version","postScriptName","trademark","manufacturer","designer","description","urlVendor","urlDesigner","licence","licenceURL","---","typoFamilyName","typoSubfamilyName","compatibleFull","sampleText","postScriptCID","wwsFamilyName","wwsSubfamilyName","lightPalette","darkPalette"],u=i+=2,d=0;d<c;d++){var g=o.readUshort(r,i);i+=2;var _=o.readUshort(r,i);i+=2;var p=o.readUshort(r,i);i+=2;var m=o.readUshort(r,i);i+=2;var M=o.readUshort(r,i);i+=2;var v=o.readUshort(r,i);i+=2;var b,R=f[m],w=u+12*c+v;if(g==0)b=o.readUnicode(r,w,M/2);else if(g==3&&_==0)b=o.readUnicode(r,w,M/2);else if(_==0)b=o.readASCII(r,w,M);else if(_==1)b=o.readUnicode(r,w,M/2);else if(_==3)b=o.readUnicode(r,w,M/2);else{if(g!=1)throw"unknown encoding "+_+", platformID: "+g;b=o.readASCII(r,w,M),console.debug("reading unknown MAC encoding "+_+" as ASCII")}var T="p"+g+","+p.toString(16);l[T]==null&&(l[T]={}),l[T][R!==void 0?R:m]=b,l[T]._lang=p}for(var P in l)if(l[P].postScriptName!=null&&l[P]._lang==1033)return l[P];for(var P in l)if(l[P].postScriptName!=null&&l[P]._lang==0)return l[P];for(var P in l)if(l[P].postScriptName!=null&&l[P]._lang==3084)return l[P];for(var P in l)if(l[P].postScriptName!=null)return l[P];for(var P in l){h=P;break}return console.debug("returning name table with languageID "+l[h]._lang),l[h]},e["OS/2"]={},e["OS/2"].parse=function(r,i,a){var o=e._bin.readUshort(r,i);i+=2;var l={};if(o==0)e["OS/2"].version0(r,i,l);else if(o==1)e["OS/2"].version1(r,i,l);else if(o==2||o==3||o==4)e["OS/2"].version2(r,i,l);else{if(o!=5)throw"unknown OS/2 table version: "+o;e["OS/2"].version5(r,i,l)}return l},e["OS/2"].version0=function(r,i,a){var o=e._bin;return a.xAvgCharWidth=o.readShort(r,i),i+=2,a.usWeightClass=o.readUshort(r,i),i+=2,a.usWidthClass=o.readUshort(r,i),i+=2,a.fsType=o.readUshort(r,i),i+=2,a.ySubscriptXSize=o.readShort(r,i),i+=2,a.ySubscriptYSize=o.readShort(r,i),i+=2,a.ySubscriptXOffset=o.readShort(r,i),i+=2,a.ySubscriptYOffset=o.readShort(r,i),i+=2,a.ySuperscriptXSize=o.readShort(r,i),i+=2,a.ySuperscriptYSize=o.readShort(r,i),i+=2,a.ySuperscriptXOffset=o.readShort(r,i),i+=2,a.ySuperscriptYOffset=o.readShort(r,i),i+=2,a.yStrikeoutSize=o.readShort(r,i),i+=2,a.yStrikeoutPosition=o.readShort(r,i),i+=2,a.sFamilyClass=o.readShort(r,i),i+=2,a.panose=o.readBytes(r,i,10),i+=10,a.ulUnicodeRange1=o.readUint(r,i),i+=4,a.ulUnicodeRange2=o.readUint(r,i),i+=4,a.ulUnicodeRange3=o.readUint(r,i),i+=4,a.ulUnicodeRange4=o.readUint(r,i),i+=4,a.achVendID=[o.readInt8(r,i),o.readInt8(r,i+1),o.readInt8(r,i+2),o.readInt8(r,i+3)],i+=4,a.fsSelection=o.readUshort(r,i),i+=2,a.usFirstCharIndex=o.readUshort(r,i),i+=2,a.usLastCharIndex=o.readUshort(r,i),i+=2,a.sTypoAscender=o.readShort(r,i),i+=2,a.sTypoDescender=o.readShort(r,i),i+=2,a.sTypoLineGap=o.readShort(r,i),i+=2,a.usWinAscent=o.readUshort(r,i),i+=2,a.usWinDescent=o.readUshort(r,i),i+=2},e["OS/2"].version1=function(r,i,a){var o=e._bin;return i=e["OS/2"].version0(r,i,a),a.ulCodePageRange1=o.readUint(r,i),i+=4,a.ulCodePageRange2=o.readUint(r,i),i+=4},e["OS/2"].version2=function(r,i,a){var o=e._bin;return i=e["OS/2"].version1(r,i,a),a.sxHeight=o.readShort(r,i),i+=2,a.sCapHeight=o.readShort(r,i),i+=2,a.usDefault=o.readUshort(r,i),i+=2,a.usBreak=o.readUshort(r,i),i+=2,a.usMaxContext=o.readUshort(r,i),i+=2},e["OS/2"].version5=function(r,i,a){var o=e._bin;return i=e["OS/2"].version2(r,i,a),a.usLowerOpticalPointSize=o.readUshort(r,i),i+=2,a.usUpperOpticalPointSize=o.readUshort(r,i),i+=2},e.post={},e.post.parse=function(r,i,a){var o=e._bin,l={};return l.version=o.readFixed(r,i),i+=4,l.italicAngle=o.readFixed(r,i),i+=4,l.underlinePosition=o.readShort(r,i),i+=2,l.underlineThickness=o.readShort(r,i),i+=2,l},e==null&&(e={}),e.U==null&&(e.U={}),e.U.codeToGlyph=function(r,i){var a=r.cmap,o=-1;if(a.p0e4!=null?o=a.p0e4:a.p3e1!=null?o=a.p3e1:a.p1e0!=null?o=a.p1e0:a.p0e3!=null&&(o=a.p0e3),o==-1)throw"no familiar platform and encoding!";var l=a.tables[o];if(l.format==0)return i>=l.map.length?0:l.map[i];if(l.format==4){for(var c=-1,h=0;h<l.endCount.length;h++)if(i<=l.endCount[h]){c=h;break}return c==-1||l.startCount[c]>i?0:65535&(l.idRangeOffset[c]!=0?l.glyphIdArray[i-l.startCount[c]+(l.idRangeOffset[c]>>1)-(l.idRangeOffset.length-c)]:i+l.idDelta[c])}if(l.format==12){if(i>l.groups[l.groups.length-1][1])return 0;for(h=0;h<l.groups.length;h++){var f=l.groups[h];if(f[0]<=i&&i<=f[1])return f[2]+(i-f[0])}return 0}throw"unknown cmap table format "+l.format},e.U.glyphToPath=function(r,i){var a={cmds:[],crds:[]};if(r.SVG&&r.SVG.entries[i]){var o=r.SVG.entries[i];return o==null?a:(typeof o=="string"&&(o=e.SVG.toPath(o),r.SVG.entries[i]=o),o)}if(r.CFF){var l={x:0,y:0,stack:[],nStems:0,haveWidth:!1,width:r.CFF.Private?r.CFF.Private.defaultWidthX:0,open:!1},c=r.CFF,h=r.CFF.Private;if(c.ROS){for(var f=0;c.FDSelect[f+2]<=i;)f+=2;h=c.FDArray[c.FDSelect[f+1]].Private}e.U._drawCFF(r.CFF.CharStrings[i],l,c,h,a)}else r.glyf&&e.U._drawGlyf(i,r,a);return a},e.U._drawGlyf=function(r,i,a){var o=i.glyf[r];o==null&&(o=i.glyf[r]=e.glyf._parseGlyf(i,r)),o!=null&&(o.noc>-1?e.U._simpleGlyph(o,a):e.U._compoGlyph(o,i,a))},e.U._simpleGlyph=function(r,i){for(var a=0;a<r.noc;a++){for(var o=a==0?0:r.endPts[a-1]+1,l=r.endPts[a],c=o;c<=l;c++){var h=c==o?l:c-1,f=c==l?o:c+1,u=1&r.flags[c],d=1&r.flags[h],g=1&r.flags[f],_=r.xs[c],p=r.ys[c];if(c==o)if(u){if(!d){e.U.P.moveTo(i,_,p);continue}e.U.P.moveTo(i,r.xs[h],r.ys[h])}else d?e.U.P.moveTo(i,r.xs[h],r.ys[h]):e.U.P.moveTo(i,(r.xs[h]+_)/2,(r.ys[h]+p)/2);u?d&&e.U.P.lineTo(i,_,p):g?e.U.P.qcurveTo(i,_,p,r.xs[f],r.ys[f]):e.U.P.qcurveTo(i,_,p,(_+r.xs[f])/2,(p+r.ys[f])/2)}e.U.P.closePath(i)}},e.U._compoGlyph=function(r,i,a){for(var o=0;o<r.parts.length;o++){var l={cmds:[],crds:[]},c=r.parts[o];e.U._drawGlyf(c.glyphIndex,i,l);for(var h=c.m,f=0;f<l.crds.length;f+=2){var u=l.crds[f],d=l.crds[f+1];a.crds.push(u*h.a+d*h.b+h.tx),a.crds.push(u*h.c+d*h.d+h.ty)}for(f=0;f<l.cmds.length;f++)a.cmds.push(l.cmds[f])}},e.U._getGlyphClass=function(r,i){var a=e._lctf.getInterval(i,r);return a==-1?0:i[a+2]},e.U._applySubs=function(r,i,a,o){for(var l=r.length-i-1,c=0;c<a.tabs.length;c++)if(a.tabs[c]!=null){var h,f=a.tabs[c];if(!f.coverage||(h=e._lctf.coverageIndex(f.coverage,r[i]))!=-1){if(a.ltype==1)r[i],f.fmt==1?r[i]=r[i]+f.delta:r[i]=f.newg[h];else if(a.ltype==4)for(var u=f.vals[h],d=0;d<u.length;d++){var g=u[d],_=g.chain.length;if(!(_>l)){for(var p=!0,m=0,M=0;M<_;M++){for(;r[i+m+(1+M)]==-1;)m++;g.chain[M]!=r[i+m+(1+M)]&&(p=!1)}if(p){for(r[i]=g.nglyph,M=0;M<_+m;M++)r[i+M+1]=-1;break}}}else if(a.ltype==5&&f.fmt==2)for(var v=e._lctf.getInterval(f.cDef,r[i]),b=f.cDef[v+2],R=f.scset[b],w=0;w<R.length;w++){var T=R[w],P=T.input;if(!(P.length>l)){for(p=!0,M=0;M<P.length;M++){var E=e._lctf.getInterval(f.cDef,r[i+1+M]);if(v==-1&&f.cDef[E+2]!=P[M]){p=!1;break}}if(p){var y=T.substLookupRecords;for(d=0;d<y.length;d+=2)y[d],y[d+1]}}}else if(a.ltype==6&&f.fmt==3){if(!e.U._glsCovered(r,f.backCvg,i-f.backCvg.length)||!e.U._glsCovered(r,f.inptCvg,i)||!e.U._glsCovered(r,f.ahedCvg,i+f.inptCvg.length))continue;var L=f.lookupRec;for(w=0;w<L.length;w+=2){v=L[w];var U=o[L[w+1]];e.U._applySubs(r,i+v,U,o)}}}}},e.U._glsCovered=function(r,i,a){for(var o=0;o<i.length;o++)if(e._lctf.coverageIndex(i[o],r[a+o])==-1)return!1;return!0},e.U.glyphsToPath=function(r,i,a){for(var o={cmds:[],crds:[]},l=0,c=0;c<i.length;c++){var h=i[c];if(h!=-1){for(var f=c<i.length-1&&i[c+1]!=-1?i[c+1]:0,u=e.U.glyphToPath(r,h),d=0;d<u.crds.length;d+=2)o.crds.push(u.crds[d]+l),o.crds.push(u.crds[d+1]);for(a&&o.cmds.push(a),d=0;d<u.cmds.length;d++)o.cmds.push(u.cmds[d]);a&&o.cmds.push("X"),l+=r.hmtx.aWidth[h],c<i.length-1&&(l+=e.U.getPairAdjustment(r,h,f))}}return o},e.U.P={},e.U.P.moveTo=function(r,i,a){r.cmds.push("M"),r.crds.push(i,a)},e.U.P.lineTo=function(r,i,a){r.cmds.push("L"),r.crds.push(i,a)},e.U.P.curveTo=function(r,i,a,o,l,c,h){r.cmds.push("C"),r.crds.push(i,a,o,l,c,h)},e.U.P.qcurveTo=function(r,i,a,o,l){r.cmds.push("Q"),r.crds.push(i,a,o,l)},e.U.P.closePath=function(r){r.cmds.push("Z")},e.U._drawCFF=function(r,i,a,o,l){for(var c=i.stack,h=i.nStems,f=i.haveWidth,u=i.width,d=i.open,g=0,_=i.x,p=i.y,m=0,M=0,v=0,b=0,R=0,w=0,T=0,P=0,E=0,y=0,L={val:0,size:0};g<r.length;){e.CFF.getCharString(r,g,L);var U=L.val;if(g+=L.size,U=="o1"||U=="o18")c.length%2!=0&&!f&&(u=c.shift()+o.nominalWidthX),h+=c.length>>1,c.length=0,f=!0;else if(U=="o3"||U=="o23")c.length%2!=0&&!f&&(u=c.shift()+o.nominalWidthX),h+=c.length>>1,c.length=0,f=!0;else if(U=="o4")c.length>1&&!f&&(u=c.shift()+o.nominalWidthX,f=!0),d&&e.U.P.closePath(l),p+=c.pop(),e.U.P.moveTo(l,_,p),d=!0;else if(U=="o5")for(;c.length>0;)_+=c.shift(),p+=c.shift(),e.U.P.lineTo(l,_,p);else if(U=="o6"||U=="o7")for(var I=c.length,N=U=="o6",W=0;W<I;W++){var k=c.shift();N?_+=k:p+=k,N=!N,e.U.P.lineTo(l,_,p)}else if(U=="o8"||U=="o24"){I=c.length;for(var se=0;se+6<=I;)m=_+c.shift(),M=p+c.shift(),v=m+c.shift(),b=M+c.shift(),_=v+c.shift(),p=b+c.shift(),e.U.P.curveTo(l,m,M,v,b,_,p),se+=6;U=="o24"&&(_+=c.shift(),p+=c.shift(),e.U.P.lineTo(l,_,p))}else{if(U=="o11")break;if(U=="o1234"||U=="o1235"||U=="o1236"||U=="o1237")U=="o1234"&&(M=p,v=(m=_+c.shift())+c.shift(),y=b=M+c.shift(),w=b,P=p,_=(T=(R=(E=v+c.shift())+c.shift())+c.shift())+c.shift(),e.U.P.curveTo(l,m,M,v,b,E,y),e.U.P.curveTo(l,R,w,T,P,_,p)),U=="o1235"&&(m=_+c.shift(),M=p+c.shift(),v=m+c.shift(),b=M+c.shift(),E=v+c.shift(),y=b+c.shift(),R=E+c.shift(),w=y+c.shift(),T=R+c.shift(),P=w+c.shift(),_=T+c.shift(),p=P+c.shift(),c.shift(),e.U.P.curveTo(l,m,M,v,b,E,y),e.U.P.curveTo(l,R,w,T,P,_,p)),U=="o1236"&&(m=_+c.shift(),M=p+c.shift(),v=m+c.shift(),y=b=M+c.shift(),w=b,T=(R=(E=v+c.shift())+c.shift())+c.shift(),P=w+c.shift(),_=T+c.shift(),e.U.P.curveTo(l,m,M,v,b,E,y),e.U.P.curveTo(l,R,w,T,P,_,p)),U=="o1237"&&(m=_+c.shift(),M=p+c.shift(),v=m+c.shift(),b=M+c.shift(),E=v+c.shift(),y=b+c.shift(),R=E+c.shift(),w=y+c.shift(),T=R+c.shift(),P=w+c.shift(),Math.abs(T-_)>Math.abs(P-p)?_=T+c.shift():p=P+c.shift(),e.U.P.curveTo(l,m,M,v,b,E,y),e.U.P.curveTo(l,R,w,T,P,_,p));else if(U=="o14"){if(c.length>0&&!f&&(u=c.shift()+a.nominalWidthX,f=!0),c.length==4){var j=c.shift(),K=c.shift(),q=c.shift(),F=c.shift(),H=e.CFF.glyphBySE(a,q),ne=e.CFF.glyphBySE(a,F);e.U._drawCFF(a.CharStrings[H],i,a,o,l),i.x=j,i.y=K,e.U._drawCFF(a.CharStrings[ne],i,a,o,l)}d&&(e.U.P.closePath(l),d=!1)}else if(U=="o19"||U=="o20")c.length%2!=0&&!f&&(u=c.shift()+o.nominalWidthX),h+=c.length>>1,c.length=0,f=!0,g+=h+7>>3;else if(U=="o21")c.length>2&&!f&&(u=c.shift()+o.nominalWidthX,f=!0),p+=c.pop(),_+=c.pop(),d&&e.U.P.closePath(l),e.U.P.moveTo(l,_,p),d=!0;else if(U=="o22")c.length>1&&!f&&(u=c.shift()+o.nominalWidthX,f=!0),_+=c.pop(),d&&e.U.P.closePath(l),e.U.P.moveTo(l,_,p),d=!0;else if(U=="o25"){for(;c.length>6;)_+=c.shift(),p+=c.shift(),e.U.P.lineTo(l,_,p);m=_+c.shift(),M=p+c.shift(),v=m+c.shift(),b=M+c.shift(),_=v+c.shift(),p=b+c.shift(),e.U.P.curveTo(l,m,M,v,b,_,p)}else if(U=="o26")for(c.length%2&&(_+=c.shift());c.length>0;)m=_,M=p+c.shift(),_=v=m+c.shift(),p=(b=M+c.shift())+c.shift(),e.U.P.curveTo(l,m,M,v,b,_,p);else if(U=="o27")for(c.length%2&&(p+=c.shift());c.length>0;)M=p,v=(m=_+c.shift())+c.shift(),b=M+c.shift(),_=v+c.shift(),p=b,e.U.P.curveTo(l,m,M,v,b,_,p);else if(U=="o10"||U=="o29"){var O=U=="o10"?o:a;if(c.length==0)console.debug("error: empty stack");else{var B=c.pop(),te=O.Subrs[B+O.Bias];i.x=_,i.y=p,i.nStems=h,i.haveWidth=f,i.width=u,i.open=d,e.U._drawCFF(te,i,a,o,l),_=i.x,p=i.y,h=i.nStems,f=i.haveWidth,u=i.width,d=i.open}}else if(U=="o30"||U=="o31"){var G=c.length,oe=(se=0,U=="o31");for(se+=G-(I=-3&G);se<I;)oe?(M=p,v=(m=_+c.shift())+c.shift(),p=(b=M+c.shift())+c.shift(),I-se==5?(_=v+c.shift(),se++):_=v,oe=!1):(m=_,M=p+c.shift(),v=m+c.shift(),b=M+c.shift(),_=v+c.shift(),I-se==5?(p=b+c.shift(),se++):p=b,oe=!0),e.U.P.curveTo(l,m,M,v,b,_,p),se+=4}else{if((U+"").charAt(0)=="o")throw console.debug("Unknown operation: "+U,r),U;c.push(U)}}}i.x=_,i.y=p,i.nStems=h,i.haveWidth=f,i.width=u,i.open=d};var t=e,n={Typr:t};return s.Typr=t,s.default=n,Object.defineProperty(s,"__esModule",{value:!0}),s}({}).Typr}/*!
Custom bundle of woff2otf (https://github.com/arty-name/woff2otf) with fflate
(https://github.com/101arrowz/fflate) for use in Troika text rendering. 
Original licenses apply: 
- fflate: https://github.com/101arrowz/fflate/blob/master/LICENSE (MIT)
- woff2otf.js: https://github.com/arty-name/woff2otf/blob/master/woff2otf.js (Apache2)
*/function G_(){return function(s){var e=Uint8Array,t=Uint16Array,n=Uint32Array,r=new e([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),i=new e([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),a=new e([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),o=function(U,I){for(var N=new t(31),W=0;W<31;++W)N[W]=I+=1<<U[W-1];var k=new n(N[30]);for(W=1;W<30;++W)for(var se=N[W];se<N[W+1];++se)k[se]=se-N[W]<<5|W;return[N,k]},l=o(r,2),c=l[0],h=l[1];c[28]=258,h[258]=28;for(var f=o(i,0)[0],u=new t(32768),d=0;d<32768;++d){var g=(43690&d)>>>1|(21845&d)<<1;g=(61680&(g=(52428&g)>>>2|(13107&g)<<2))>>>4|(3855&g)<<4,u[d]=((65280&g)>>>8|(255&g)<<8)>>>1}var _=function(U,I,N){for(var W=U.length,k=0,se=new t(I);k<W;++k)++se[U[k]-1];var j,K=new t(I);for(k=0;k<I;++k)K[k]=K[k-1]+se[k-1]<<1;{j=new t(1<<I);var q=15-I;for(k=0;k<W;++k)if(U[k])for(var F=k<<4|U[k],H=I-U[k],ne=K[U[k]-1]++<<H,O=ne|(1<<H)-1;ne<=O;++ne)j[u[ne]>>>q]=F}return j},p=new e(288);for(d=0;d<144;++d)p[d]=8;for(d=144;d<256;++d)p[d]=9;for(d=256;d<280;++d)p[d]=7;for(d=280;d<288;++d)p[d]=8;var m=new e(32);for(d=0;d<32;++d)m[d]=5;var M=_(p,9),v=_(m,5),b=function(U){for(var I=U[0],N=1;N<U.length;++N)U[N]>I&&(I=U[N]);return I},R=function(U,I,N){var W=I/8|0;return(U[W]|U[W+1]<<8)>>(7&I)&N},w=function(U,I){var N=I/8|0;return(U[N]|U[N+1]<<8|U[N+2]<<16)>>(7&I)},T=["unexpected EOF","invalid block type","invalid length/literal","invalid distance","stream finished","no stream handler",,"no callback","invalid UTF-8 data","extra field too long","date not in range 1980-2099","filename too long","stream finishing","invalid zip data"],P=function(U,I,N){var W=new Error(I||T[U]);if(W.code=U,Error.captureStackTrace&&Error.captureStackTrace(W,P),!N)throw W;return W},E=function(U,I,N){var W=U.length;if(!W||N&&!N.l&&W<5)return I||new e(0);var k=!I||N,se=!N||N.i;N||(N={}),I||(I=new e(3*W));var j,K=function(xe){var Ne=I.length;if(xe>Ne){var Ve=new e(Math.max(2*Ne,xe));Ve.set(I),I=Ve}},q=N.f||0,F=N.p||0,H=N.b||0,ne=N.l,O=N.d,B=N.m,te=N.n,G=8*W;do{if(!ne){N.f=q=R(U,F,1);var oe=R(U,F+1,3);if(F+=3,!oe){var pe=U[(C=((j=F)/8|0)+(7&j&&1)+4)-4]|U[C-3]<<8,ve=C+pe;if(ve>W){se&&P(0);break}k&&K(H+pe),I.set(U.subarray(C,ve),H),N.b=H+=pe,N.p=F=8*ve;continue}if(oe==1)ne=M,O=v,B=9,te=5;else if(oe==2){var D=R(U,F,31)+257,he=R(U,F+10,15)+4,Pe=D+R(U,F+5,31)+1;F+=14;for(var Ue=new e(Pe),de=new e(19),ye=0;ye<he;++ye)de[a[ye]]=R(U,F+3*ye,7);F+=3*he;var Me=b(de),fe=(1<<Me)-1,Ce=_(de,Me);for(ye=0;ye<Pe;){var C,x=Ce[R(U,F,fe)];if(F+=15&x,(C=x>>>4)<16)Ue[ye++]=C;else{var X=0,Z=0;for(C==16?(Z=3+R(U,F,3),F+=2,X=Ue[ye-1]):C==17?(Z=3+R(U,F,7),F+=3):C==18&&(Z=11+R(U,F,127),F+=7);Z--;)Ue[ye++]=X}}var ie=Ue.subarray(0,D),Q=Ue.subarray(D);B=b(ie),te=b(Q),ne=_(ie,B),O=_(Q,te)}else P(1);if(F>G){se&&P(0);break}}k&&K(H+131072);for(var Te=(1<<B)-1,le=(1<<te)-1,ce=F;;ce=F){var Se=(X=ne[w(U,F)&Te])>>>4;if((F+=15&X)>G){se&&P(0);break}if(X||P(2),Se<256)I[H++]=Se;else{if(Se==256){ce=F,ne=null;break}var ue=Se-254;if(Se>264){var be=r[ye=Se-257];ue=R(U,F,(1<<be)-1)+c[ye],F+=be}var Be=O[w(U,F)&le],we=Be>>>4;if(Be||P(3),F+=15&Be,Q=f[we],we>3&&(be=i[we],Q+=w(U,F)&(1<<be)-1,F+=be),F>G){se&&P(0);break}k&&K(H+131072);for(var me=H+ue;H<me;H+=4)I[H]=I[H-Q],I[H+1]=I[H+1-Q],I[H+2]=I[H+2-Q],I[H+3]=I[H+3-Q];H=me}}N.l=ne,N.p=ce,N.b=H,ne&&(q=1,N.m=B,N.d=O,N.n=te)}while(!q);return H==I.length?I:function(xe,Ne,Ve){(Ve==null||Ve>xe.length)&&(Ve=xe.length);var S=new(xe instanceof t?t:xe instanceof n?n:e)(Ve-Ne);return S.set(xe.subarray(Ne,Ve)),S}(I,0,H)},y=new e(0),L=typeof TextDecoder<"u"&&new TextDecoder;try{L.decode(y,{stream:!0})}catch{}return s.convert_streams=function(U){var I=new DataView(U),N=0;function W(){var D=I.getUint16(N);return N+=2,D}function k(){var D=I.getUint32(N);return N+=4,D}function se(D){pe.setUint16(ve,D),ve+=2}function j(D){pe.setUint32(ve,D),ve+=4}for(var K={signature:k(),flavor:k(),length:k(),numTables:W(),reserved:W(),totalSfntSize:k(),majorVersion:W(),minorVersion:W(),metaOffset:k(),metaLength:k(),metaOrigLength:k(),privOffset:k(),privLength:k()},q=0;Math.pow(2,q)<=K.numTables;)q++;q--;for(var F=16*Math.pow(2,q),H=16*K.numTables-F,ne=12,O=[],B=0;B<K.numTables;B++)O.push({tag:k(),offset:k(),compLength:k(),origLength:k(),origChecksum:k()}),ne+=16;var te,G=new Uint8Array(12+16*O.length+O.reduce(function(D,he){return D+he.origLength+4},0)),oe=G.buffer,pe=new DataView(oe),ve=0;return j(K.flavor),se(K.numTables),se(F),se(q),se(H),O.forEach(function(D){j(D.tag),j(D.origChecksum),j(ne),j(D.origLength),D.outOffset=ne,(ne+=D.origLength)%4!=0&&(ne+=4-ne%4)}),O.forEach(function(D){var he,Pe=U.slice(D.offset,D.offset+D.compLength);if(D.compLength!=D.origLength){var Ue=new Uint8Array(D.origLength);he=new Uint8Array(Pe,2),E(he,Ue)}else Ue=new Uint8Array(Pe);G.set(Ue,D.outOffset);var de=0;(ne=D.outOffset+D.origLength)%4!=0&&(de=4-ne%4),G.set(new Uint8Array(de).buffer,D.outOffset+D.origLength),te=ne+de}),oe.slice(0,te)},Object.defineProperty(s,"__esModule",{value:!0}),s}({}).convert_streams}function H_(s,e){const t={M:2,L:2,Q:4,C:6,Z:0},n={C:"18g,ca,368,1kz",D:"17k,6,2,2+4,5+c,2+6,2+1,10+1,9+f,j+11,2+1,a,2,2+1,15+2,3,j+2,6+3,2+8,2,2,2+1,w+a,4+e,3+3,2,3+2,3+5,23+w,2f+4,3,2+9,2,b,2+3,3,1k+9,6+1,3+1,2+2,2+d,30g,p+y,1,1+1g,f+x,2,sd2+1d,jf3+4,f+3,2+4,2+2,b+3,42,2,4+2,2+1,2,3,t+1,9f+w,2,el+2,2+g,d+2,2l,2+1,5,3+1,2+1,2,3,6,16wm+1v",R:"17m+3,2,2,6+3,m,15+2,2+2,h+h,13,3+8,2,2,3+1,2,p+1,x,5+4,5,a,2,2,3,u,c+2,g+1,5,2+1,4+1,5j,6+1,2,b,2+2,f,2+1,1s+2,2,3+1,7,1ez0,2,2+1,4+4,b,4,3,b,42,2+2,4,3,2+1,2,o+3,ae,ep,x,2o+2,3+1,3,5+1,6",L:"x9u,jff,a,fd,jv",T:"4t,gj+33,7o+4,1+1,7c+18,2,2+1,2+1,2,21+a,2,1b+k,h,2u+6,3+5,3+1,2+3,y,2,v+q,2k+a,1n+8,a,p+3,2+8,2+2,2+4,18+2,3c+e,2+v,1k,2,5+7,5,4+6,b+1,u,1n,5+3,9,l+1,r,3+1,1m,5+1,5+1,3+2,4,v+1,4,c+1,1m,5+4,2+1,5,l+1,n+5,2,1n,3,2+3,9,8+1,c+1,v,1q,d,1f,4,1m+2,6+2,2+3,8+1,c+1,u,1n,3,7,6+1,l+1,t+1,1m+1,5+3,9,l+1,u,21,8+2,2,2j,3+6,d+7,2r,3+8,c+5,23+1,s,2,2,1k+d,2+4,2+1,6+a,2+z,a,2v+3,2+5,2+1,3+1,q+1,5+2,h+3,e,3+1,7,g,jk+2,qb+2,u+2,u+1,v+1,1t+1,2+6,9,3+a,a,1a+2,3c+1,z,3b+2,5+1,a,7+2,64+1,3,1n,2+6,2,2,3+7,7+9,3,1d+d,1,1+1,1s+3,1d,2+4,2,6,15+8,d+1,x+3,3+1,2+2,1l,2+1,4,2+2,1n+7,3+1,49+2,2+c,2+6,5,7,4+1,5j+1l,2+4,ek,3+1,r+4,1e+4,6+5,2p+c,1+3,1,1+2,1+b,2db+2,3y,2p+v,ff+3,30+1,n9x,1+2,2+9,x+1,29+1,7l,4,5,q+1,6,48+1,r+h,e,13+7,q+a,1b+2,1d,3+3,3+1,14,1w+5,3+1,3+1,d,9,1c,1g,2+2,3+1,6+1,2,17+1,9,6n,3,5,fn5,ki+f,h+f,5s,6y+2,ea,6b,46+4,1af+2,2+1,6+3,15+2,5,4m+1,fy+3,as+1,4a+a,4x,1j+e,1l+2,1e+3,3+1,1y+2,11+4,2+7,1r,d+1,1h+8,b+3,3,2o+2,3,2+1,7,4h,4+7,m+1,1m+1,4,12+6,4+4,5g+7,3+2,2,o,2d+5,2,5+1,2+1,6n+3,7+1,2+1,s+1,2e+7,3,2+1,2z,2,3+5,2,2u+2,3+3,2+4,78+8,2+1,75+1,2,5,41+3,3+1,5,x+9,15+5,3+3,9,a+5,3+2,1b+c,2+1,bb+6,2+5,2,2b+l,3+6,2+1,2+1,3f+5,4,2+1,2+6,2,21+1,4,2,9o+1,470+8,at4+4,1o+6,t5,1s+3,2a,f5l+1,2+3,43o+2,a+7,1+7,3+6,v+3,45+2,1j0+1i,5+1d,9,f,n+4,2+e,11t+6,2+g,3+6,2+1,2+4,7a+6,c6+3,15t+6,32+6,1,gzau,v+2n,3l+6n"},r=1,i=2,a=4,o=8,l=16,c=32;let h;function f(T){if(!h){const P={R:i,L:r,D:a,C:l,U:c,T:o};h=new Map;for(let E in n){let y=0;n[E].split(",").forEach(L=>{let[U,I]=L.split("+");U=parseInt(U,36),I=I?parseInt(I,36):0,h.set(y+=U,P[E]);for(let N=I;N--;)h.set(++y,P[E])})}}return h.get(T)||c}const u=1,d=2,g=3,_=4,p=[null,"isol","init","fina","medi"];function m(T){const P=new Uint8Array(T.length);let E=c,y=u,L=-1;for(let U=0;U<T.length;U++){const I=T.codePointAt(U);let N=f(I)|0,W=u;N&o||(E&(r|a|l)?N&(i|a|l)?(W=g,(y===u||y===g)&&P[L]++):N&(r|c)&&(y===d||y===_)&&P[L]--:E&(i|c)&&(y===d||y===_)&&P[L]--,y=P[U]=W,E=N,L=U,I>65535&&U++)}return P}function M(T,P){const E=[];for(let L=0;L<P.length;L++){const U=P.codePointAt(L);U>65535&&L++,E.push(s.U.codeToGlyph(T,U))}const y=T.GSUB;if(y){const{lookupList:L,featureList:U}=y;let I;const N=/^(rlig|liga|mset|isol|init|fina|medi|half|pres|blws|ccmp)$/,W=[];U.forEach(k=>{if(N.test(k.tag))for(let se=0;se<k.tab.length;se++){if(W[k.tab[se]])continue;W[k.tab[se]]=!0;const j=L[k.tab[se]],K=/^(isol|init|fina|medi)$/.test(k.tag);K&&!I&&(I=m(P));for(let q=0;q<E.length;q++)(!I||!K||p[I[q]]===k.tag)&&s.U._applySubs(E,q,j,L)}})}return E}function v(T,P){const E=new Int16Array(P.length*3);let y=0;for(;y<P.length;y++){const N=P[y];if(N===-1)continue;E[y*3+2]=T.hmtx.aWidth[N];const W=T.GPOS;if(W){const k=W.lookupList;for(let se=0;se<k.length;se++){const j=k[se];for(let K=0;K<j.tabs.length;K++){const q=j.tabs[K];if(j.ltype===1){if(s._lctf.coverageIndex(q.coverage,N)!==-1&&q.pos){I(q.pos,y);break}}else if(j.ltype===2){let F=null,H=L();if(H!==-1){const ne=s._lctf.coverageIndex(q.coverage,P[H]);if(ne!==-1){if(q.fmt===1){const O=q.pairsets[ne];for(let B=0;B<O.length;B++)O[B].gid2===N&&(F=O[B])}else if(q.fmt===2){const O=s.U._getGlyphClass(P[H],q.classDef1),B=s.U._getGlyphClass(N,q.classDef2);F=q.matrix[O][B]}if(F){F.val1&&I(F.val1,H),F.val2&&I(F.val2,y);break}}}}else if(j.ltype===4){const F=s._lctf.coverageIndex(q.markCoverage,N);if(F!==-1){const H=L(U),ne=H===-1?-1:s._lctf.coverageIndex(q.baseCoverage,P[H]);if(ne!==-1){const O=q.markArray[F],B=q.baseArray[ne][O.markClass];E[y*3]=B.x-O.x+E[H*3]-E[H*3+2],E[y*3+1]=B.y-O.y+E[H*3+1];break}}}else if(j.ltype===6){const F=s._lctf.coverageIndex(q.mark1Coverage,N);if(F!==-1){const H=L();if(H!==-1){const ne=P[H];if(b(T,ne)===3){const O=s._lctf.coverageIndex(q.mark2Coverage,ne);if(O!==-1){const B=q.mark1Array[F],te=q.mark2Array[O][B.markClass];E[y*3]=te.x-B.x+E[H*3]-E[H*3+2],E[y*3+1]=te.y-B.y+E[H*3+1];break}}}}}}}}else if(T.kern&&!T.cff){const k=L();if(k!==-1){const se=T.kern.glyph1.indexOf(P[k]);if(se!==-1){const j=T.kern.rval[se].glyph2.indexOf(N);j!==-1&&(E[k*3+2]+=T.kern.rval[se].vals[j])}}}}return E;function L(N){for(let W=y-1;W>=0;W--)if(P[W]!==-1&&(!N||N(P[W])))return W;return-1}function U(N){return b(T,N)===1}function I(N,W){for(let k=0;k<3;k++)E[W*3+k]+=N[k]||0}}function b(T,P){const E=T.GDEF&&T.GDEF.glyphClassDef;return E?s.U._getGlyphClass(P,E):0}function R(...T){for(let P=0;P<T.length;P++)if(typeof T[P]=="number")return T[P]}function w(T){const P=Object.create(null),E=T["OS/2"],y=T.hhea,L=T.head.unitsPerEm,U=R(E&&E.sTypoAscender,y&&y.ascender,L),I={unitsPerEm:L,ascender:U,descender:R(E&&E.sTypoDescender,y&&y.descender,0),capHeight:R(E&&E.sCapHeight,U),xHeight:R(E&&E.sxHeight,U),lineGap:R(E&&E.sTypoLineGap,y&&y.lineGap),supportsCodePoint(N){return s.U.codeToGlyph(T,N)>0},forEachGlyph(N,W,k,se){let j=0;const K=1/I.unitsPerEm*W,q=M(T,N);let F=0;const H=v(T,q);return q.forEach((ne,O)=>{if(ne!==-1){let B=P[ne];if(!B){const{cmds:te,crds:G}=s.U.glyphToPath(T,ne);let oe="",pe=0;for(let Ue=0,de=te.length;Ue<de;Ue++){const ye=t[te[Ue]];oe+=te[Ue];for(let Me=1;Me<=ye;Me++)oe+=(Me>1?",":"")+G[pe++]}let ve,D,he,Pe;if(G.length){ve=D=1/0,he=Pe=-1/0;for(let Ue=0,de=G.length;Ue<de;Ue+=2){let ye=G[Ue],Me=G[Ue+1];ye<ve&&(ve=ye),Me<D&&(D=Me),ye>he&&(he=ye),Me>Pe&&(Pe=Me)}}else ve=he=D=Pe=0;B=P[ne]={index:ne,advanceWidth:T.hmtx.aWidth[ne],xMin:ve,yMin:D,xMax:he,yMax:Pe,path:oe}}se.call(null,B,j+H[O*3]*K,H[O*3+1]*K,F),j+=H[O*3+2]*K,k&&(j+=k*W)}F+=N.codePointAt(F)>65535?2:1}),j}};return I}return function(P){const E=new Uint8Array(P,0,4),y=s._bin.readASCII(E,0,4);if(y==="wOFF")P=e(P);else if(y==="wOF2")throw new Error("woff2 fonts not supported");return w(s.parse(P)[0])}}const V_=Gi({name:"Typr Font Parser",dependencies:[z_,G_,H_],init(s,e,t){const n=s(),r=e();return t(n,r)}});/*!
Custom bundle of @unicode-font-resolver/client v1.0.2 (https://github.com/lojjic/unicode-font-resolver)
for use in Troika text rendering. 
Original MIT license applies
*/function W_(){return function(s){var e=function(){this.buckets=new Map};e.prototype.add=function(v){var b=v>>5;this.buckets.set(b,(this.buckets.get(b)||0)|1<<(31&v))},e.prototype.has=function(v){var b=this.buckets.get(v>>5);return b!==void 0&&(b&1<<(31&v))!=0},e.prototype.serialize=function(){var v=[];return this.buckets.forEach(function(b,R){v.push((+R).toString(36)+":"+b.toString(36))}),v.join(",")},e.prototype.deserialize=function(v){var b=this;this.buckets.clear(),v.split(",").forEach(function(R){var w=R.split(":");b.buckets.set(parseInt(w[0],36),parseInt(w[1],36))})};var t=Math.pow(2,8),n=t-1,r=~n;function i(v){var b=function(w){return w&r}(v).toString(16),R=function(w){return(w&r)+t-1}(v).toString(16);return"codepoint-index/plane"+(v>>16)+"/"+b+"-"+R+".json"}function a(v,b){var R=v&n,w=b.codePointAt(R/6|0);return((w=(w||48)-48)&1<<R%6)!=0}function o(v,b){var R;(R=v,R.replace(/U\+/gi,"").replace(/^,+|,+$/g,"").split(/,+/).map(function(w){return w.split("-").map(function(T){return parseInt(T.trim(),16)})})).forEach(function(w){var T=w[0],P=w[1];P===void 0&&(P=T),b(T,P)})}function l(v,b){o(v,function(R,w){for(var T=R;T<=w;T++)b(T)})}var c={},h={},f=new WeakMap,u="https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data";function d(v){var b=f.get(v);return b||(b=new e,l(v.ranges,function(R){return b.add(R)}),f.set(v,b)),b}var g,_=new Map;function p(v,b,R){return v[b]?b:v[R]?R:function(w){for(var T in w)return T}(v)}function m(v,b){var R=b;if(!v.includes(R)){R=1/0;for(var w=0;w<v.length;w++)Math.abs(v[w]-b)<Math.abs(R-b)&&(R=v[w])}return R}function M(v){return g||(g=new Set,l("9-D,20,85,A0,1680,2000-200A,2028-202F,205F,3000",function(b){g.add(b)})),g.has(v)}return s.CodePointSet=e,s.clearCache=function(){c={},h={}},s.getFontsForString=function(v,b){b===void 0&&(b={});var R,w=b.lang;w===void 0&&(w=new RegExp("\\p{Script=Hangul}","u").test(R=v)?"ko":new RegExp("\\p{Script=Hiragana}|\\p{Script=Katakana}","u").test(R)?"ja":"en");var T=b.category;T===void 0&&(T="sans-serif");var P=b.style;P===void 0&&(P="normal");var E=b.weight;E===void 0&&(E=400);var y=(b.dataUrl||u).replace(/\/$/g,""),L=new Map,U=new Uint8Array(v.length),I={},N={},W=new Array(v.length),k=new Map,se=!1;function j(F){var H=_.get(F);return H||(H=fetch(y+"/"+F).then(function(ne){if(!ne.ok)throw new Error(ne.statusText);return ne.json().then(function(O){if(!Array.isArray(O)||O[0]!==1)throw new Error("Incorrect schema version; need 1, got "+O[0]);return O[1]})}).catch(function(ne){if(y!==u)return se||(console.error('unicode-font-resolver: Failed loading from dataUrl "'+y+'", trying default CDN. '+ne.message),se=!0),y=u,_.delete(F),j(F);throw ne}),_.set(F,H)),H}for(var K=function(F){var H=v.codePointAt(F),ne=i(H);W[F]=ne,c[ne]||k.has(ne)||k.set(ne,j(ne).then(function(O){c[ne]=O})),H>65535&&(F++,q=F)},q=0;q<v.length;q++)K(q);return Promise.all(k.values()).then(function(){k.clear();for(var F=function(ne){var O=v.codePointAt(ne),B=null,te=c[W[ne]],G=void 0;for(var oe in te){var pe=N[oe];if(pe===void 0&&(pe=N[oe]=new RegExp(oe).test(w||"en")),pe){for(var ve in G=oe,te[oe])if(a(O,te[oe][ve])){B=ve;break}break}}if(!B){e:for(var D in te)if(D!==G){for(var he in te[D])if(a(O,te[D][he])){B=he;break e}}}B||(console.debug("No font coverage for U+"+O.toString(16)),B="latin"),W[ne]=B,h[B]||k.has(B)||k.set(B,j("font-meta/"+B+".json").then(function(Pe){h[B]=Pe})),O>65535&&(ne++,H=ne)},H=0;H<v.length;H++)F(H);return Promise.all(k.values())}).then(function(){for(var F,H=null,ne=0;ne<v.length;ne++){var O=v.codePointAt(ne);if(H&&(M(O)||d(H).has(O)))U[ne]=U[ne-1];else{H=h[W[ne]];var B=I[H.id];if(!B){var te=H.typeforms,G=p(te,T,"sans-serif"),oe=p(te[G],P,"normal"),pe=m((F=te[G])===null||F===void 0?void 0:F[oe],E);B=I[H.id]=y+"/font-files/"+H.id+"/"+G+"."+oe+"."+pe+".woff"}var ve=L.get(B);ve==null&&(ve=L.size,L.set(B,ve)),U[ne]=ve}O>65535&&(ne++,U[ne]=U[ne-1])}return{fontUrls:Array.from(L.keys()),chars:U}})},Object.defineProperty(s,"__esModule",{value:!0}),s}({})}function X_(s,e){const t=Object.create(null),n=Object.create(null);function r(a,o){const l=c=>{console.error(`Failure loading font ${a}`,c)};try{const c=new XMLHttpRequest;c.open("get",a,!0),c.responseType="arraybuffer",c.onload=function(){if(c.status>=400)l(new Error(c.statusText));else if(c.status>0)try{const h=s(c.response);h.src=a,o(h)}catch(h){l(h)}},c.onerror=l,c.send()}catch(c){l(c)}}function i(a,o){let l=t[a];l?o(l):n[a]?n[a].push(o):(n[a]=[o],r(a,c=>{c.src=a,t[a]=c,n[a].forEach(h=>h(c)),delete n[a]}))}return function(a,o,{lang:l,fonts:c=[],style:h="normal",weight:f="normal",unicodeFontsURL:u}={}){const d=new Uint8Array(a.length),g=[];a.length||M();const _=new Map,p=[];if(h!=="italic"&&(h="normal"),typeof f!="number"&&(f=f==="bold"?700:400),c&&!Array.isArray(c)&&(c=[c]),c=c.slice().filter(b=>!b.lang||b.lang.test(l)).reverse(),c.length){let T=0;(function P(E=0){for(let y=E,L=a.length;y<L;y++){const U=a.codePointAt(y);if(T===1&&g[d[y-1]].supportsCodePoint(U)||y>0&&/\s/.test(a[y]))d[y]=d[y-1],T===2&&(p[p.length-1][1]=y);else for(let I=d[y],N=c.length;I<=N;I++)if(I===N){const W=T===2?p[p.length-1]:p[p.length]=[y,y];W[1]=y,T=2}else{d[y]=I;const{src:W,unicodeRange:k}=c[I];if(!k||v(U,k)){const se=t[W];if(!se){i(W,()=>{P(y)});return}if(se.supportsCodePoint(U)){let j=_.get(se);typeof j!="number"&&(j=g.length,g.push(se),_.set(se,j)),d[y]=j,T=1;break}}}U>65535&&y+1<L&&(d[y+1]=d[y],y++,T===2&&(p[p.length-1][1]=y))}m()})()}else p.push([0,a.length-1]),m();function m(){if(p.length){const b=p.map(R=>a.substring(R[0],R[1]+1)).join(`
`);e.getFontsForString(b,{lang:l||void 0,style:h,weight:f,dataUrl:u}).then(({fontUrls:R,chars:w})=>{const T=g.length;let P=0;p.forEach(y=>{for(let L=0,U=y[1]-y[0];L<=U;L++)d[y[0]+L]=w[P++]+T;P++});let E=0;R.forEach((y,L)=>{i(y,U=>{g[L+T]=U,++E===R.length&&M()})})})}else M()}function M(){o({chars:d,fonts:g})}function v(b,R){for(let w=0;w<R.length;w++){const[T,P=T]=R[w];if(T<=b&&b<=P)return!0}return!1}}}const Y_=Gi({name:"FontResolver",dependencies:[X_,V_,W_],init(s,e,t){return s(e,t())}});function j_(s,e){const n=/[\u00AD\u034F\u061C\u115F-\u1160\u17B4-\u17B5\u180B-\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF0-\uFFF8]/,r="[^\\S\\u00A0]",i=new RegExp(`${r}|[\\-\\u007C\\u00AD\\u2010\\u2012-\\u2014\\u2027\\u2056\\u2E17\\u2E40]`);function a({text:g,lang:_,fonts:p,style:m,weight:M,preResolvedFonts:v,unicodeFontsURL:b},R){const w=({chars:T,fonts:P})=>{let E,y;const L=[];for(let U=0;U<T.length;U++)T[U]!==y?(y=T[U],L.push(E={start:U,end:U,fontObj:P[T[U]]})):E.end=U;R(L)};v?w(v):s(g,w,{lang:_,fonts:p,style:m,weight:M,unicodeFontsURL:b})}function o({text:g="",font:_,lang:p,sdfGlyphSize:m=64,fontSize:M=400,fontWeight:v=1,fontStyle:b="normal",letterSpacing:R=0,lineHeight:w="normal",maxWidth:T=1/0,direction:P,textAlign:E="left",textIndent:y=0,whiteSpace:L="normal",overflowWrap:U="normal",anchorX:I=0,anchorY:N=0,metricsOnly:W=!1,unicodeFontsURL:k,preResolvedFonts:se=null,includeCaretPositions:j=!1,chunkedBoundsSize:K=8192,colorRanges:q=null},F){const H=f(),ne={fontLoad:0,typesetting:0};g.indexOf("\r")>-1&&(console.info("Typesetter: got text with \\r chars; normalizing to \\n"),g=g.replace(/\r\n/g,`
`).replace(/\r/g,`
`)),M=+M,R=+R,T=+T,w=w||"normal",y=+y,a({text:g,lang:p,style:b,weight:v,fonts:typeof _=="string"?[{src:_}]:_,unicodeFontsURL:k,preResolvedFonts:se},O=>{ne.fontLoad=f()-H;const B=isFinite(T);let te=null,G=null,oe=null,pe=null,ve=null,D=null,he=null,Pe=null,Ue=0,de=0,ye=L!=="nowrap";const Me=new Map,fe=f();let Ce=y,C=0,x=new u;const X=[x];O.forEach(le=>{const{fontObj:ce}=le,{ascender:Se,descender:ue,unitsPerEm:be,lineGap:Be,capHeight:we,xHeight:me}=ce;let xe=Me.get(ce);if(!xe){const z=M/be,ee=w==="normal"?(Se-ue+Be)*z:w*M,ge=(ee-(Se-ue)*z)/2,Ae=Math.min(ee,(Se-ue)*z),Re=(Se+ue)/2*z+Ae/2;xe={index:Me.size,src:ce.src,fontObj:ce,fontSizeMult:z,unitsPerEm:be,ascender:Se*z,descender:ue*z,capHeight:we*z,xHeight:me*z,lineHeight:ee,baseline:-ge-Se*z,caretTop:Re,caretBottom:Re-Ae},Me.set(ce,xe)}const{fontSizeMult:Ne}=xe,Ve=g.slice(le.start,le.end+1);let S,$;ce.forEachGlyph(Ve,M,R,(z,ee,ge,Ae)=>{ee+=C,Ae+=le.start,S=ee,$=z;const Re=g.charAt(Ae),je=z.advanceWidth*Ne,We=x.count;let Le;if("isEmpty"in z||(z.isWhitespace=!!Re&&new RegExp(r).test(Re),z.canBreakAfter=!!Re&&i.test(Re),z.isEmpty=z.xMin===z.xMax||z.yMin===z.yMax||n.test(Re)),!z.isWhitespace&&!z.isEmpty&&de++,ye&&B&&!z.isWhitespace&&ee+je+Ce>T&&We){if(x.glyphAt(We-1).glyphObj.canBreakAfter)Le=new u,Ce=-ee;else for(let Je=We;Je--;)if(Je===0&&U==="break-word"){Le=new u,Ce=-ee;break}else if(x.glyphAt(Je).glyphObj.canBreakAfter){Le=x.splitAt(Je+1);const tt=Le.glyphAt(0).x;Ce-=tt;for(let $e=Le.count;$e--;)Le.glyphAt($e).x-=tt;break}Le&&(x.isSoftWrapped=!0,x=Le,X.push(x),Ue=T)}let Xe=x.glyphAt(x.count);Xe.glyphObj=z,Xe.x=ee+Ce,Xe.y=ge,Xe.width=je,Xe.charIndex=Ae,Xe.fontData=xe,Re===`
`&&(x=new u,X.push(x),Ce=-(ee+je+R*M)+y)}),C=S+$.advanceWidth*Ne+R*M});let Z=0;X.forEach(le=>{let ce=!0;for(let Se=le.count;Se--;){const ue=le.glyphAt(Se);ce&&!ue.glyphObj.isWhitespace&&(le.width=ue.x+ue.width,le.width>Ue&&(Ue=le.width),ce=!1);let{lineHeight:be,capHeight:Be,xHeight:we,baseline:me}=ue.fontData;be>le.lineHeight&&(le.lineHeight=be);const xe=me-le.baseline;xe<0&&(le.baseline+=xe,le.cap+=xe,le.ex+=xe),le.cap=Math.max(le.cap,le.baseline+Be),le.ex=Math.max(le.ex,le.baseline+we)}le.baseline-=Z,le.cap-=Z,le.ex-=Z,Z+=le.lineHeight});let ie=0,Q=0;if(I&&(typeof I=="number"?ie=-I:typeof I=="string"&&(ie=-Ue*(I==="left"?0:I==="center"?.5:I==="right"?1:c(I)))),N&&(typeof N=="number"?Q=-N:typeof N=="string"&&(Q=N==="top"?0:N==="top-baseline"?-X[0].baseline:N==="top-cap"?-X[0].cap:N==="top-ex"?-X[0].ex:N==="middle"?Z/2:N==="bottom"?Z:N==="bottom-baseline"?-X[X.length-1].baseline:c(N)*Z)),!W){const le=e.getEmbeddingLevels(g,P);te=new Uint16Array(de),G=new Uint8Array(de),oe=new Float32Array(de*2),pe={},he=[1/0,1/0,-1/0,-1/0],Pe=[],j&&(D=new Float32Array(g.length*4)),q&&(ve=new Uint8Array(de*3));let ce=0,Se=-1,ue=-1,be,Be;if(X.forEach((we,me)=>{let{count:xe,width:Ne}=we;if(xe>0){let Ve=0;for(let Ae=xe;Ae--&&we.glyphAt(Ae).glyphObj.isWhitespace;)Ve++;let S=0,$=0;if(E==="center")S=(Ue-Ne)/2;else if(E==="right")S=Ue-Ne;else if(E==="justify"&&we.isSoftWrapped){let Ae=0;for(let Re=xe-Ve;Re--;)we.glyphAt(Re).glyphObj.isWhitespace&&Ae++;$=(Ue-Ne)/Ae}if($||S){let Ae=0;for(let Re=0;Re<xe;Re++){let je=we.glyphAt(Re);const We=je.glyphObj;je.x+=S+Ae,$!==0&&We.isWhitespace&&Re<xe-Ve&&(Ae+=$,je.width+=$)}}const z=e.getReorderSegments(g,le,we.glyphAt(0).charIndex,we.glyphAt(we.count-1).charIndex);for(let Ae=0;Ae<z.length;Ae++){const[Re,je]=z[Ae];let We=1/0,Le=-1/0;for(let Xe=0;Xe<xe;Xe++)if(we.glyphAt(Xe).charIndex>=Re){let Je=Xe,tt=Xe;for(;tt<xe;tt++){let $e=we.glyphAt(tt);if($e.charIndex>je)break;tt<xe-Ve&&(We=Math.min(We,$e.x),Le=Math.max(Le,$e.x+$e.width))}for(let $e=Je;$e<tt;$e++){const lt=we.glyphAt($e);lt.x=Le-(lt.x+lt.width-We)}break}}let ee;const ge=Ae=>ee=Ae;for(let Ae=0;Ae<xe;Ae++){const Re=we.glyphAt(Ae);ee=Re.glyphObj;const je=ee.index,We=le.levels[Re.charIndex]&1;if(We){const Le=e.getMirroredCharacter(g[Re.charIndex]);Le&&Re.fontData.fontObj.forEachGlyph(Le,0,0,ge)}if(j){const{charIndex:Le,fontData:Xe}=Re,Je=Re.x+ie,tt=Re.x+Re.width+ie;D[Le*4]=We?tt:Je,D[Le*4+1]=We?Je:tt,D[Le*4+2]=we.baseline+Xe.caretBottom+Q,D[Le*4+3]=we.baseline+Xe.caretTop+Q;const $e=Le-Se;$e>1&&h(D,Se,$e),Se=Le}if(q){const{charIndex:Le}=Re;for(;Le>ue;)ue++,q.hasOwnProperty(ue)&&(Be=q[ue])}if(!ee.isWhitespace&&!ee.isEmpty){const Le=ce++,{fontSizeMult:Xe,src:Je,index:tt}=Re.fontData,$e=pe[Je]||(pe[Je]={});$e[je]||($e[je]={path:ee.path,pathBounds:[ee.xMin,ee.yMin,ee.xMax,ee.yMax]});const lt=Re.x+ie,St=Re.y+we.baseline+Q;oe[Le*2]=lt,oe[Le*2+1]=St;const gt=lt+ee.xMin*Xe,qt=St+ee.yMin*Xe,Gt=lt+ee.xMax*Xe,Ht=St+ee.yMax*Xe;gt<he[0]&&(he[0]=gt),qt<he[1]&&(he[1]=qt),Gt>he[2]&&(he[2]=Gt),Ht>he[3]&&(he[3]=Ht),Le%K===0&&(be={start:Le,end:Le,rect:[1/0,1/0,-1/0,-1/0]},Pe.push(be)),be.end++;const dt=be.rect;if(gt<dt[0]&&(dt[0]=gt),qt<dt[1]&&(dt[1]=qt),Gt>dt[2]&&(dt[2]=Gt),Ht>dt[3]&&(dt[3]=Ht),te[Le]=je,G[Le]=tt,q){const cn=Le*3;ve[cn]=Be>>16&255,ve[cn+1]=Be>>8&255,ve[cn+2]=Be&255}}}}}),D){const we=g.length-Se;we>1&&h(D,Se,we)}}const Te=[];Me.forEach(({index:le,src:ce,unitsPerEm:Se,ascender:ue,descender:be,lineHeight:Be,capHeight:we,xHeight:me})=>{Te[le]={src:ce,unitsPerEm:Se,ascender:ue,descender:be,lineHeight:Be,capHeight:we,xHeight:me}}),ne.typesetting=f()-fe,F({glyphIds:te,glyphFontIndices:G,glyphPositions:oe,glyphData:pe,fontData:Te,caretPositions:D,glyphColors:ve,chunkedBounds:Pe,fontSize:M,topBaseline:Q+X[0].baseline,blockBounds:[ie,Q-Z,ie+Ue,Q],visibleBounds:he,timings:ne})})}function l(g,_){o({...g,metricsOnly:!0},p=>{const[m,M,v,b]=p.blockBounds;_({width:v-m,height:b-M})})}function c(g){let _=g.match(/^([\d.]+)%$/),p=_?parseFloat(_[1]):NaN;return isNaN(p)?0:p/100}function h(g,_,p){const m=g[_*4],M=g[_*4+1],v=g[_*4+2],b=g[_*4+3],R=(M-m)/p;for(let w=0;w<p;w++){const T=(_+w)*4;g[T]=m+R*w,g[T+1]=m+R*(w+1),g[T+2]=v,g[T+3]=b}}function f(){return(self.performance||Date).now()}function u(){this.data=[]}const d=["glyphObj","x","y","width","charIndex","fontData"];return u.prototype={width:0,lineHeight:0,baseline:0,cap:0,ex:0,isSoftWrapped:!1,get count(){return Math.ceil(this.data.length/d.length)},glyphAt(g){let _=u.flyweight;return _.data=this.data,_.index=g,_},splitAt(g){let _=new u;return _.data=this.data.splice(g*d.length),_}},u.flyweight=d.reduce((g,_,p,m)=>(Object.defineProperty(g,_,{get(){return this.data[this.index*d.length+p]},set(M){this.data[this.index*d.length+p]=M}}),g),{data:null,index:0}),{typeset:o,measure:l}}const $n=()=>(self.performance||Date).now(),Ts=ih();let ec;function q_(s,e,t,n,r,i,a,o,l,c,h=!0){return h?Z_(s,e,t,n,r,i,a,o,l,c).then(null,f=>(ec||(console.warn("WebGL SDF generation failed, falling back to JS",f),ec=!0),nc(s,e,t,n,r,i,a,o,l,c))):nc(s,e,t,n,r,i,a,o,l,c)}const as=[],K_=5;let Na=0;function sh(){const s=$n();for(;as.length&&$n()-s<K_;)as.shift()();Na=as.length?setTimeout(sh,0):0}const Z_=(...s)=>new Promise((e,t)=>{as.push(()=>{const n=$n();try{Ts.webgl.generateIntoCanvas(...s),e({timing:$n()-n})}catch(r){t(r)}}),Na||(Na=setTimeout(sh,0))}),J_=4,Q_=2e3,tc={};let $_=0;function nc(s,e,t,n,r,i,a,o,l,c){const h="TroikaTextSDFGenerator_JS_"+$_++%J_;let f=tc[h];return f||(f=tc[h]={workerModule:Gi({name:h,workerId:h,dependencies:[ih,$n],init(u,d){const g=u().javascript.generate;return function(..._){const p=d();return{textureData:g(..._),timing:d()-p}}},getTransferables(u){return[u.textureData.buffer]}}),requests:0,idleTimer:null}),f.requests++,clearTimeout(f.idleTimer),f.workerModule(s,e,t,n,r,i).then(({textureData:u,timing:d})=>{const g=$n(),_=new Uint8Array(u.length*4);for(let p=0;p<u.length;p++)_[p*4+c]=u[p];return Ts.webglUtils.renderImageData(a,_,o,l,s,e,1<<3-c),d+=$n()-g,--f.requests===0&&(f.idleTimer=setTimeout(()=>{P_(h)},Q_)),{timing:d}})}function ev(s){s._warm||(Ts.webgl.isSupported(s),s._warm=!0)}const tv=Ts.webglUtils.resizeWebGLCanvasWithoutClearing,lr={unicodeFontsURL:null,sdfGlyphSize:64,sdfMargin:1/16,sdfExponent:9,textureWidth:2048},nv=new Ye;function Ei(){return(self.performance||Date).now()}const ic=Object.create(null);function iv(s,e){s=sv({},s);const t=Ei(),n=[];if(s.font&&n.push({label:"user",src:av(s.font)}),s.font=n,s.text=""+s.text,s.sdfGlyphSize=s.sdfGlyphSize||lr.sdfGlyphSize,s.unicodeFontsURL=s.unicodeFontsURL||lr.unicodeFontsURL,s.colorRanges!=null){let u={};for(let d in s.colorRanges)if(s.colorRanges.hasOwnProperty(d)){let g=s.colorRanges[d];typeof g!="number"&&(g=nv.set(g).getHex()),u[d]=g}s.colorRanges=u}Object.freeze(s);const{textureWidth:r,sdfExponent:i}=lr,{sdfGlyphSize:a}=s,o=r/a*4;let l=ic[a];if(!l){const u=document.createElement("canvas");u.width=r,u.height=a*256/o,l=ic[a]={glyphCount:0,sdfGlyphSize:a,sdfCanvas:u,sdfTexture:new Tt(u,void 0,void 0,void 0,kt,kt),contextLost:!1,glyphsByFont:new Map},l.sdfTexture.generateMipmaps=!1,rv(l)}const{sdfTexture:c,sdfCanvas:h}=l;lh(s).then(u=>{const{glyphIds:d,glyphFontIndices:g,fontData:_,glyphPositions:p,fontSize:m,timings:M}=u,v=[],b=new Float32Array(d.length*4);let R=0,w=0;const T=Ei(),P=_.map(I=>{let N=l.glyphsByFont.get(I.src);return N||l.glyphsByFont.set(I.src,N=new Map),N});d.forEach((I,N)=>{const W=g[N],{src:k,unitsPerEm:se}=_[W];let j=P[W].get(I);if(!j){const{path:ne,pathBounds:O}=u.glyphData[k][I],B=Math.max(O[2]-O[0],O[3]-O[1])/a*(lr.sdfMargin*a+.5),te=l.glyphCount++,G=[O[0]-B,O[1]-B,O[2]+B,O[3]+B];P[W].set(I,j={path:ne,atlasIndex:te,sdfViewBox:G}),v.push(j)}const{sdfViewBox:K}=j,q=p[w++],F=p[w++],H=m/se;b[R++]=q+K[0]*H,b[R++]=F+K[1]*H,b[R++]=q+K[2]*H,b[R++]=F+K[3]*H,d[N]=j.atlasIndex}),M.quads=(M.quads||0)+(Ei()-T);const E=Ei();M.sdf={};const y=h.height,L=Math.ceil(l.glyphCount/o),U=Math.pow(2,Math.ceil(Math.log2(L*a)));U>y&&(console.info(`Increasing SDF texture size ${y}->${U}`),tv(h,r,U),c.dispose()),Promise.all(v.map(I=>ah(I,l,s.gpuAccelerateSDF).then(({timing:N})=>{M.sdf[I.atlasIndex]=N}))).then(()=>{v.length&&!l.contextLost&&(oh(l),c.needsUpdate=!0),M.sdfTotal=Ei()-E,M.total=Ei()-t,e(Object.freeze({parameters:s,sdfTexture:c,sdfGlyphSize:a,sdfExponent:i,glyphBounds:b,glyphAtlasIndices:d,glyphColors:u.glyphColors,caretPositions:u.caretPositions,chunkedBounds:u.chunkedBounds,ascender:u.ascender,descender:u.descender,lineHeight:u.lineHeight,capHeight:u.capHeight,xHeight:u.xHeight,topBaseline:u.topBaseline,blockBounds:u.blockBounds,visibleBounds:u.visibleBounds,timings:u.timings}))})}),Promise.resolve().then(()=>{l.contextLost||ev(h)})}function ah({path:s,atlasIndex:e,sdfViewBox:t},{sdfGlyphSize:n,sdfCanvas:r,contextLost:i},a){if(i)return Promise.resolve({timing:-1});const{textureWidth:o,sdfExponent:l}=lr,c=Math.max(t[2]-t[0],t[3]-t[1]),h=Math.floor(e/4),f=h%(o/n)*n,u=Math.floor(h/(o/n))*n,d=e%4;return q_(n,n,s,t,c,l,r,f,u,d,a)}function rv(s){const e=s.sdfCanvas;e.addEventListener("webglcontextlost",t=>{console.log("Context Lost",t),t.preventDefault(),s.contextLost=!0}),e.addEventListener("webglcontextrestored",t=>{console.log("Context Restored",t),s.contextLost=!1;const n=[];s.glyphsByFont.forEach(r=>{r.forEach(i=>{n.push(ah(i,s,!0))})}),Promise.all(n).then(()=>{oh(s),s.sdfTexture.needsUpdate=!0})})}function sv(s,e){for(let t in e)e.hasOwnProperty(t)&&(s[t]=e[t]);return s}let ts;function av(s){return ts||(ts=typeof document>"u"?{}:document.createElement("a")),ts.href=s,ts.href}function oh(s){if(typeof createImageBitmap!="function"){console.info("Safari<15: applying SDF canvas workaround");const{sdfCanvas:e,sdfTexture:t}=s,{width:n,height:r}=e,i=s.sdfCanvas.getContext("webgl");let a=t.image.data;(!a||a.length!==n*r*4)&&(a=new Uint8Array(n*r*4),t.image={width:n,height:r,data:a},t.flipY=!1,t.isDataTexture=!0),i.readPixels(0,0,n,r,i.RGBA,i.UNSIGNED_BYTE,a)}}const ov=Gi({name:"Typesetter",dependencies:[j_,Y_,D_],init(s,e,t){return s(e,t())}}),lh=Gi({name:"Typesetter",dependencies:[ov],init(s){return function(e){return new Promise(t=>{s.typeset(e,t)})}},getTransferables(s){const e=[];for(let t in s)s[t]&&s[t].buffer&&e.push(s[t].buffer);return e}});lh.onMainThread;const rc={};function lv(s){let e=rc[s];return e||(e=rc[s]=new ii(1,1,s,s).translate(.5,.5,0)),e}const cv="aTroikaGlyphBounds",sc="aTroikaGlyphIndex",hv="aTroikaGlyphColor";class uv extends r_{constructor(){super(),this.detail=1,this.curveRadius=0,this.groups=[{start:0,count:1/0,materialIndex:0},{start:0,count:1/0,materialIndex:1}],this.boundingSphere=new ni,this.boundingBox=new Sn}computeBoundingSphere(){}computeBoundingBox(){}set detail(e){if(e!==this._detail){this._detail=e,(typeof e!="number"||e<1)&&(e=1);let t=lv(e);["position","normal","uv"].forEach(n=>{this.attributes[n]=t.attributes[n].clone()}),this.setIndex(t.getIndex().clone())}}get detail(){return this._detail}set curveRadius(e){e!==this._curveRadius&&(this._curveRadius=e,this._updateBounds())}get curveRadius(){return this._curveRadius}updateGlyphs(e,t,n,r,i){this.updateAttributeData(cv,e,4),this.updateAttributeData(sc,t,1),this.updateAttributeData(hv,i,3),this._blockBounds=n,this._chunkedBounds=r,this.instanceCount=t.length,this._updateBounds()}_updateBounds(){const e=this._blockBounds;if(e){const{curveRadius:t,boundingBox:n}=this;if(t){const{PI:r,floor:i,min:a,max:o,sin:l,cos:c}=Math,h=r/2,f=r*2,u=Math.abs(t),d=e[0]/u,g=e[2]/u,_=i((d+h)/f)!==i((g+h)/f)?-u:a(l(d)*u,l(g)*u),p=i((d-h)/f)!==i((g-h)/f)?u:o(l(d)*u,l(g)*u),m=i((d+r)/f)!==i((g+r)/f)?u*2:o(u-c(d)*u,u-c(g)*u);n.min.set(_,e[1],t<0?-m:0),n.max.set(p,e[3],t<0?0:m)}else n.min.set(e[0],e[1],0),n.max.set(e[2],e[3],0);n.getBoundingSphere(this.boundingSphere)}}applyClipRect(e){let t=this.getAttribute(sc).count,n=this._chunkedBounds;if(n)for(let r=n.length;r--;){t=n[r].end;let i=n[r].rect;if(i[1]<e.w&&i[3]>e.y&&i[0]<e.z&&i[2]>e.x)break}this.instanceCount=t}updateAttributeData(e,t,n){const r=this.getAttribute(e);t?r&&r.array.length===t.length?(r.array.set(t),r.needsUpdate=!0):(this.setAttribute(e,new Ra(t,n)),delete this._maxInstanceCount,this.dispose()):r&&this.deleteAttribute(e)}}const fv=`
uniform vec2 uTroikaSDFTextureSize;
uniform float uTroikaSDFGlyphSize;
uniform vec4 uTroikaTotalBounds;
uniform vec4 uTroikaClipRect;
uniform mat3 uTroikaOrient;
uniform bool uTroikaUseGlyphColors;
uniform float uTroikaEdgeOffset;
uniform float uTroikaBlurRadius;
uniform vec2 uTroikaPositionOffset;
uniform float uTroikaCurveRadius;
attribute vec4 aTroikaGlyphBounds;
attribute float aTroikaGlyphIndex;
attribute vec3 aTroikaGlyphColor;
varying vec2 vTroikaGlyphUV;
varying vec4 vTroikaTextureUVBounds;
varying float vTroikaTextureChannel;
varying vec3 vTroikaGlyphColor;
varying vec2 vTroikaGlyphDimensions;
`,dv=`
vec4 bounds = aTroikaGlyphBounds;
bounds.xz += uTroikaPositionOffset.x;
bounds.yw -= uTroikaPositionOffset.y;

vec4 outlineBounds = vec4(
  bounds.xy - uTroikaEdgeOffset - uTroikaBlurRadius,
  bounds.zw + uTroikaEdgeOffset + uTroikaBlurRadius
);
vec4 clippedBounds = vec4(
  clamp(outlineBounds.xy, uTroikaClipRect.xy, uTroikaClipRect.zw),
  clamp(outlineBounds.zw, uTroikaClipRect.xy, uTroikaClipRect.zw)
);

vec2 clippedXY = (mix(clippedBounds.xy, clippedBounds.zw, position.xy) - bounds.xy) / (bounds.zw - bounds.xy);

position.xy = mix(bounds.xy, bounds.zw, clippedXY);

uv = (position.xy - uTroikaTotalBounds.xy) / (uTroikaTotalBounds.zw - uTroikaTotalBounds.xy);

float rad = uTroikaCurveRadius;
if (rad != 0.0) {
  float angle = position.x / rad;
  position.xz = vec2(sin(angle) * rad, rad - cos(angle) * rad);
  normal.xz = vec2(sin(angle), cos(angle));
}
  
position = uTroikaOrient * position;
normal = uTroikaOrient * normal;

vTroikaGlyphUV = clippedXY.xy;
vTroikaGlyphDimensions = vec2(bounds[2] - bounds[0], bounds[3] - bounds[1]);


float txCols = uTroikaSDFTextureSize.x / uTroikaSDFGlyphSize;
vec2 txUvPerSquare = uTroikaSDFGlyphSize / uTroikaSDFTextureSize;
vec2 txStartUV = txUvPerSquare * vec2(
  mod(floor(aTroikaGlyphIndex / 4.0), txCols),
  floor(floor(aTroikaGlyphIndex / 4.0) / txCols)
);
vTroikaTextureUVBounds = vec4(txStartUV, vec2(txStartUV) + txUvPerSquare);
vTroikaTextureChannel = mod(aTroikaGlyphIndex, 4.0);
`,pv=`
uniform sampler2D uTroikaSDFTexture;
uniform vec2 uTroikaSDFTextureSize;
uniform float uTroikaSDFGlyphSize;
uniform float uTroikaSDFExponent;
uniform float uTroikaEdgeOffset;
uniform float uTroikaFillOpacity;
uniform float uTroikaBlurRadius;
uniform vec3 uTroikaStrokeColor;
uniform float uTroikaStrokeWidth;
uniform float uTroikaStrokeOpacity;
uniform bool uTroikaSDFDebug;
varying vec2 vTroikaGlyphUV;
varying vec4 vTroikaTextureUVBounds;
varying float vTroikaTextureChannel;
varying vec2 vTroikaGlyphDimensions;

float troikaSdfValueToSignedDistance(float alpha) {
  // Inverse of exponential encoding in webgl-sdf-generator
  
  float maxDimension = max(vTroikaGlyphDimensions.x, vTroikaGlyphDimensions.y);
  float absDist = (1.0 - pow(2.0 * (alpha > 0.5 ? 1.0 - alpha : alpha), 1.0 / uTroikaSDFExponent)) * maxDimension;
  float signedDist = absDist * (alpha > 0.5 ? -1.0 : 1.0);
  return signedDist;
}

float troikaGlyphUvToSdfValue(vec2 glyphUV) {
  vec2 textureUV = mix(vTroikaTextureUVBounds.xy, vTroikaTextureUVBounds.zw, glyphUV);
  vec4 rgba = texture2D(uTroikaSDFTexture, textureUV);
  float ch = floor(vTroikaTextureChannel + 0.5); //NOTE: can't use round() in WebGL1
  return ch == 0.0 ? rgba.r : ch == 1.0 ? rgba.g : ch == 2.0 ? rgba.b : rgba.a;
}

float troikaGlyphUvToDistance(vec2 uv) {
  return troikaSdfValueToSignedDistance(troikaGlyphUvToSdfValue(uv));
}

float troikaGetAADist() {
  
  #if defined(GL_OES_standard_derivatives) || __VERSION__ >= 300
  return length(fwidth(vTroikaGlyphUV * vTroikaGlyphDimensions)) * 0.5;
  #else
  return vTroikaGlyphDimensions.x / 64.0;
  #endif
}

float troikaGetFragDistValue() {
  vec2 clampedGlyphUV = clamp(vTroikaGlyphUV, 0.5 / uTroikaSDFGlyphSize, 1.0 - 0.5 / uTroikaSDFGlyphSize);
  float distance = troikaGlyphUvToDistance(clampedGlyphUV);
 
  // Extrapolate distance when outside bounds:
  distance += clampedGlyphUV == vTroikaGlyphUV ? 0.0 : 
    length((vTroikaGlyphUV - clampedGlyphUV) * vTroikaGlyphDimensions);

  

  return distance;
}

float troikaGetEdgeAlpha(float distance, float distanceOffset, float aaDist) {
  #if defined(IS_DEPTH_MATERIAL) || defined(IS_DISTANCE_MATERIAL)
  float alpha = step(-distanceOffset, -distance);
  #else

  float alpha = smoothstep(
    distanceOffset + aaDist,
    distanceOffset - aaDist,
    distance
  );
  #endif

  return alpha;
}
`,mv=`
float aaDist = troikaGetAADist();
float fragDistance = troikaGetFragDistValue();
float edgeAlpha = uTroikaSDFDebug ?
  troikaGlyphUvToSdfValue(vTroikaGlyphUV) :
  troikaGetEdgeAlpha(fragDistance, uTroikaEdgeOffset, max(aaDist, uTroikaBlurRadius));

#if !defined(IS_DEPTH_MATERIAL) && !defined(IS_DISTANCE_MATERIAL)
vec4 fillRGBA = gl_FragColor;
fillRGBA.a *= uTroikaFillOpacity;
vec4 strokeRGBA = uTroikaStrokeWidth == 0.0 ? fillRGBA : vec4(uTroikaStrokeColor, uTroikaStrokeOpacity);
if (fillRGBA.a == 0.0) fillRGBA.rgb = strokeRGBA.rgb;
gl_FragColor = mix(fillRGBA, strokeRGBA, smoothstep(
  -uTroikaStrokeWidth - aaDist,
  -uTroikaStrokeWidth + aaDist,
  fragDistance
));
gl_FragColor.a *= edgeAlpha;
#endif

if (edgeAlpha == 0.0) {
  discard;
}
`;function gv(s){const e=Fa(s,{chained:!0,extensions:{derivatives:!0},uniforms:{uTroikaSDFTexture:{value:null},uTroikaSDFTextureSize:{value:new Oe},uTroikaSDFGlyphSize:{value:0},uTroikaSDFExponent:{value:0},uTroikaTotalBounds:{value:new ht(0,0,0,0)},uTroikaClipRect:{value:new ht(0,0,0,0)},uTroikaEdgeOffset:{value:0},uTroikaFillOpacity:{value:1},uTroikaPositionOffset:{value:new Oe},uTroikaCurveRadius:{value:0},uTroikaBlurRadius:{value:0},uTroikaStrokeWidth:{value:0},uTroikaStrokeColor:{value:new Ye},uTroikaStrokeOpacity:{value:1},uTroikaOrient:{value:new Ke},uTroikaUseGlyphColors:{value:!0},uTroikaSDFDebug:{value:!1}},vertexDefs:fv,vertexTransform:dv,fragmentDefs:pv,fragmentColorTransform:mv,customRewriter({vertexShader:t,fragmentShader:n}){let r=/\buniform\s+vec3\s+diffuse\b/;return r.test(n)&&(n=n.replace(r,"varying vec3 vTroikaGlyphColor").replace(/\bdiffuse\b/g,"vTroikaGlyphColor"),r.test(t)||(t=t.replace(rh,`uniform vec3 diffuse;
$&
vTroikaGlyphColor = uTroikaUseGlyphColors ? aTroikaGlyphColor / 255.0 : diffuse;
`))),{vertexShader:t,fragmentShader:n}}});return e.transparent=!0,e.forceSinglePass=!0,Object.defineProperties(e,{isTroikaTextMaterial:{value:!0},shadowSide:{get(){return this.side},set(){}}}),e}const Ya=new pr({color:16777215,side:sn,transparent:!0}),ac=8421504,oc=new it,ns=new V,xa=new V,ar=[],_v=new V,ya="+x+y";function lc(s){return Array.isArray(s)?s[0]:s}let ch=()=>{const s=new Rt(new ii(1,1),Ya);return ch=()=>s,s},hh=()=>{const s=new Rt(new ii(1,1,32,1),Ya);return hh=()=>s,s};const vv={type:"syncstart"},xv={type:"synccomplete"},uh=["font","fontSize","fontStyle","fontWeight","lang","letterSpacing","lineHeight","maxWidth","overflowWrap","text","direction","textAlign","textIndent","whiteSpace","anchorX","anchorY","colorRanges","sdfGlyphSize"],yv=uh.concat("material","color","depthOffset","clipRect","curveRadius","orientation","glyphGeometryDetail");class fh extends Rt{constructor(){const e=new uv;super(e,null),this.text="",this.anchorX=0,this.anchorY=0,this.curveRadius=0,this.direction="auto",this.font=null,this.unicodeFontsURL=null,this.fontSize=.1,this.fontWeight="normal",this.fontStyle="normal",this.lang=null,this.letterSpacing=0,this.lineHeight="normal",this.maxWidth=1/0,this.overflowWrap="normal",this.textAlign="left",this.textIndent=0,this.whiteSpace="normal",this.material=null,this.color=null,this.colorRanges=null,this.outlineWidth=0,this.outlineColor=0,this.outlineOpacity=1,this.outlineBlur=0,this.outlineOffsetX=0,this.outlineOffsetY=0,this.strokeWidth=0,this.strokeColor=ac,this.strokeOpacity=1,this.fillOpacity=1,this.depthOffset=0,this.clipRect=null,this.orientation=ya,this.glyphGeometryDetail=1,this.sdfGlyphSize=null,this.gpuAccelerateSDF=!0,this.debugSDF=!1}sync(e){this._needsSync&&(this._needsSync=!1,this._isSyncing?(this._queuedSyncs||(this._queuedSyncs=[])).push(e):(this._isSyncing=!0,this.dispatchEvent(vv),iv({text:this.text,font:this.font,lang:this.lang,fontSize:this.fontSize||.1,fontWeight:this.fontWeight||"normal",fontStyle:this.fontStyle||"normal",letterSpacing:this.letterSpacing||0,lineHeight:this.lineHeight||"normal",maxWidth:this.maxWidth,direction:this.direction||"auto",textAlign:this.textAlign,textIndent:this.textIndent,whiteSpace:this.whiteSpace,overflowWrap:this.overflowWrap,anchorX:this.anchorX,anchorY:this.anchorY,colorRanges:this.colorRanges,includeCaretPositions:!0,sdfGlyphSize:this.sdfGlyphSize,gpuAccelerateSDF:this.gpuAccelerateSDF,unicodeFontsURL:this.unicodeFontsURL},t=>{this._isSyncing=!1,this._textRenderInfo=t,this.geometry.updateGlyphs(t.glyphBounds,t.glyphAtlasIndices,t.blockBounds,t.chunkedBounds,t.glyphColors);const n=this._queuedSyncs;n&&(this._queuedSyncs=null,this._needsSync=!0,this.sync(()=>{n.forEach(r=>r&&r())})),this.dispatchEvent(xv),e&&e()})))}onBeforeRender(e,t,n,r,i,a){this.sync(),i.isTroikaTextMaterial&&this._prepareForRender(i)}dispose(){this.geometry.dispose()}get textRenderInfo(){return this._textRenderInfo||null}createDerivedMaterial(e){return gv(e)}get material(){let e=this._derivedMaterial;const t=this._baseMaterial||this._defaultMaterial||(this._defaultMaterial=Ya.clone());if((!e||!e.isDerivedFrom(t))&&(e=this._derivedMaterial=this.createDerivedMaterial(t),t.addEventListener("dispose",function n(){t.removeEventListener("dispose",n),e.dispose()})),this.hasOutline()){let n=e._outlineMtl;return n||(n=e._outlineMtl=Object.create(e,{id:{value:e.id+.1}}),n.isTextOutlineMaterial=!0,n.depthWrite=!1,n.map=null,e.addEventListener("dispose",function r(){e.removeEventListener("dispose",r),n.dispose()})),[n,e]}else return e}set material(e){e&&e.isTroikaTextMaterial?(this._derivedMaterial=e,this._baseMaterial=e.baseMaterial):this._baseMaterial=e}hasOutline(){return!!(this.outlineWidth||this.outlineBlur||this.outlineOffsetX||this.outlineOffsetY)}get glyphGeometryDetail(){return this.geometry.detail}set glyphGeometryDetail(e){this.geometry.detail=e}get curveRadius(){return this.geometry.curveRadius}set curveRadius(e){this.geometry.curveRadius=e}get customDepthMaterial(){return lc(this.material).getDepthMaterial()}set customDepthMaterial(e){}get customDistanceMaterial(){return lc(this.material).getDistanceMaterial()}set customDistanceMaterial(e){}_prepareForRender(e){const t=e.isTextOutlineMaterial,n=e.uniforms,r=this.textRenderInfo;if(r){const{sdfTexture:o,blockBounds:l}=r;n.uTroikaSDFTexture.value=o,n.uTroikaSDFTextureSize.value.set(o.image.width,o.image.height),n.uTroikaSDFGlyphSize.value=r.sdfGlyphSize,n.uTroikaSDFExponent.value=r.sdfExponent,n.uTroikaTotalBounds.value.fromArray(l),n.uTroikaUseGlyphColors.value=!t&&!!r.glyphColors;let c=0,h=0,f=0,u,d,g,_=0,p=0;if(t){let{outlineWidth:M,outlineOffsetX:v,outlineOffsetY:b,outlineBlur:R,outlineOpacity:w}=this;c=this._parsePercent(M)||0,h=Math.max(0,this._parsePercent(R)||0),u=w,_=this._parsePercent(v)||0,p=this._parsePercent(b)||0}else f=Math.max(0,this._parsePercent(this.strokeWidth)||0),f&&(g=this.strokeColor,n.uTroikaStrokeColor.value.set(g??ac),d=this.strokeOpacity,d==null&&(d=1)),u=this.fillOpacity;n.uTroikaEdgeOffset.value=c,n.uTroikaPositionOffset.value.set(_,p),n.uTroikaBlurRadius.value=h,n.uTroikaStrokeWidth.value=f,n.uTroikaStrokeOpacity.value=d,n.uTroikaFillOpacity.value=u??1,n.uTroikaCurveRadius.value=this.curveRadius||0;let m=this.clipRect;if(m&&Array.isArray(m)&&m.length===4)n.uTroikaClipRect.value.fromArray(m);else{const M=(this.fontSize||.1)*100;n.uTroikaClipRect.value.set(l[0]-M,l[1]-M,l[2]+M,l[3]+M)}this.geometry.applyClipRect(n.uTroikaClipRect.value)}n.uTroikaSDFDebug.value=!!this.debugSDF,e.polygonOffset=!!this.depthOffset,e.polygonOffsetFactor=e.polygonOffsetUnits=this.depthOffset||0;const i=t?this.outlineColor||0:this.color;if(i==null)delete e.color;else{const o=e.hasOwnProperty("color")?e.color:e.color=new Ye;(i!==o._input||typeof i=="object")&&o.set(o._input=i)}let a=this.orientation||ya;if(a!==e._orientation){let o=n.uTroikaOrient.value;a=a.replace(/[^-+xyz]/g,"");let l=a!==ya&&a.match(/^([-+])([xyz])([-+])([xyz])$/);if(l){let[,c,h,f,u]=l;ns.set(0,0,0)[h]=c==="-"?1:-1,xa.set(0,0,0)[u]=f==="-"?-1:1,oc.lookAt(_v,ns.cross(xa),xa),o.setFromMatrix4(oc)}else o.identity();e._orientation=a}}_parsePercent(e){if(typeof e=="string"){let t=e.match(/^(-?[\d.]+)%$/),n=t?parseFloat(t[1]):NaN;e=(isNaN(n)?0:n/100)*this.fontSize}return e}localPositionToTextCoords(e,t=new Oe){t.copy(e);const n=this.curveRadius;return n&&(t.x=Math.atan2(e.x,Math.abs(n)-Math.abs(e.z))*Math.abs(n)),t}worldPositionToTextCoords(e,t=new Oe){return ns.copy(e),this.localPositionToTextCoords(this.worldToLocal(ns),t)}raycast(e,t){const{textRenderInfo:n,curveRadius:r}=this;if(n){const i=n.blockBounds,a=r?hh():ch(),o=a.geometry,{position:l,uv:c}=o.attributes;for(let h=0;h<c.count;h++){let f=i[0]+c.getX(h)*(i[2]-i[0]);const u=i[1]+c.getY(h)*(i[3]-i[1]);let d=0;r&&(d=r-Math.cos(f/r)*r,f=Math.sin(f/r)*r),l.setXYZ(h,f,u,d)}o.boundingSphere=this.geometry.boundingSphere,o.boundingBox=this.geometry.boundingBox,a.matrixWorld=this.matrixWorld,a.material.side=this.material.side,ar.length=0,a.raycast(e,ar);for(let h=0;h<ar.length;h++)ar[h].object=this,t.push(ar[h])}}copy(e){const t=this.geometry;return super.copy(e),this.geometry=t,yv.forEach(n=>{this[n]=e[n]}),this}clone(){return new this.constructor().copy(this)}}uh.forEach(s=>{const e="_private_"+s;Object.defineProperty(fh.prototype,s,{get(){return this[e]},set(t){t!==this[e]&&(this[e]=t,this._needsSync=!0)}})});new Sn;new Ye;const Sv=6,Mv=5;function bv(s,e,t,n,r){const i=new Set,a=[],o=Math.min(s.length,e.length/3);for(let l=0;l<o;l+=1){const c=s[l];if(n!==null&&n.has(c)){i.size<r&&i.add(c);continue}const h=e[l*3]-t.x,f=e[l*3+1]-t.y,u=e[l*3+2]-t.z;a.push({id:c,d2:h*h+f*f+u*u})}a.sort((l,c)=>l.d2-c.d2);for(const l of a){if(i.size>=r)break;i.add(l.id)}return i}class Ev{constructor(e,t,n){this.scene=e,this.store=t,this.engine=n,this.active=new Map,this.pool=[],this.theme=null,this.styleStamp=0}applyTheme(e){this.theme=e,this.styleStamp+=1}_styleText(e){const{label:t}=this.theme;e.fontSize=t.size,e.color=t.color,e.outlineColor=t.halo,e.outlineWidth=t.size*.12,e.anchorX="center",e.anchorY="bottom",e.userData.styleStamp=this.styleStamp}_acquire(e){const t=this.pool.pop()??new fh;return t.parent||this.scene.add(t),t.visible=!0,t.userData.opacity=0,t.userData.text=null,this.active.set(e,t),t}_release(e,t){t.visible=!1,this.active.delete(e),this.pool.push(t)}update(e,t,n,r){if(!this.theme)return;const i=this.theme.label.budget??200,a=bv(this.engine.ids,this.engine.positions,t.position,n,i);for(const l of a)!this.active.has(l)&&this.store.nodes.has(l)&&this._acquire(l);const o=Math.min(1,e*Sv);for(const[l,c]of this.active){const h=this.store.nodes.get(l),f=r.get(l);if(!h||!f){this._release(l,c);continue}const u=a.has(l)?1:0;if(c.userData.opacity+=(u-c.userData.opacity)*o,u===0&&c.userData.opacity<.02){this._release(l,c);continue}c.fillOpacity=c.userData.opacity,c.outlineOpacity=c.userData.opacity;const d=th(h,this.store.nodeTypes,this.theme);c.position.set(f.x,f.y+Mv*d.size,f.z),c.quaternion.copy(t.quaternion);const g=c.userData.styleStamp!==this.styleStamp;(c.userData.text!==h.label||g)&&(g&&this._styleText(c),c.text=h.label,c.userData.text=h.label,c.sync())}}}const cc=8,Tv=1;function wv(s,e,t){const n=[];for(const c of s){const h=t.get(c);if(!h)return null;n.push(h)}const r=[];let i=0;for(let c=0;c<n.length-1;c+=1){const h=n[c+1].x-n[c].x,f=n[c+1].y-n[c].y,u=n[c+1].z-n[c].z,d=Math.hypot(h,f,u);r.push(d),i+=d}if(i===0)return{x:n[0].x,y:n[0].y,z:n[0].z};let o=Math.max(0,Math.min(1,e))*i;for(let c=0;c<r.length;c+=1){if(o<=r[c]||c===r.length-1){const h=r[c]===0?0:o/r[c],f=n[c],u=n[c+1];return{x:f.x+(u.x-f.x)*h,y:f.y+(u.y-f.y)*h,z:f.z+(u.z-f.z)*h}}o-=r[c]}const l=n[n.length-1];return{x:l.x,y:l.y,z:l.z}}function hc(s,e){let t=0;for(let n=0;n<s.length-1;n+=1){const r=e.get(s[n]),i=e.get(s[n+1]);if(!r||!i)return 0;t+=Math.hypot(i.x-r.x,i.y-r.y,i.z-r.z)}return t}function Av(s,e,t){if(s.color)return s.color;if(e&&e.color)return e.color;const n=t.palette??[];return s.type_index!=null&&n.length>0?n[s.type_index%n.length]:t.flow.color}class Cv{constructor(e,t){this.path=e.path,this.flowType=e.flow_type??null,this.typeIndex=e.type_index??null,this.color=e.color??null,this.size=e.size??null,this.count=e.count,this.interval=Math.max(.001,e.interval??.2),this.speed=e.speed??1,this.flowId=e.flow_id??null,this.emitted=0,this.nextEmit=t,this.particles=[],this.done=!1}step(e,t){for(;this.nextEmit<=e&&(this.count===null||this.emitted<this.count);)this.particles.push({born:this.nextEmit}),this.emitted+=1,this.nextEmit+=this.interval;t>0&&(this.particles=this.particles.filter(n=>e-n.born<t)),this.count!==null&&this.emitted>=this.count&&this.particles.length===0&&(this.done=!0)}}class Rv{constructor(e,{now:t=()=>performance.now()/1e3}={}){this.store=e,this.now=t,this.flows=[],this.persistent=new Map}applyFlow(e){const t=new Cv(e,this.now());if(t.flowId!==null){const n=this.persistent.get(t.flowId);n&&(this.flows=this.flows.filter(r=>r!==n)),this.persistent.set(t.flowId,t)}this.flows.push(t)}stopFlow(e){const t=this.persistent.get(e);t&&(this.persistent.delete(e),this.flows=this.flows.filter(n=>n!==t))}replayInit(e){this.flows=this.flows.filter(t=>t.flowId===null),this.persistent.clear();for(const t of e)this.applyFlow(t)}activeCount(){return this.flows.length}_speedOf(e){var n;const t=((n=this.store.flowTypes)==null?void 0:n[e.flowType])??null;return e.speed*((t==null?void 0:t.speed)??1)}update(e,t){var o;const n=this.now(),r=((o=t==null?void 0:t.flow)==null?void 0:o.baseSpeed)??0,i=this._display;for(const l of this.flows){let c=0;if(r>0&&i){const h=hc(l.path,i),f=r*this._speedOf(l);c=h>0&&f>0?h/f:0}l.step(n,c)}const a=this.store.nodes;this.flows=this.flows.filter(l=>l.flowId===null&&l.done?!1:a&&l.path.some(c=>!a.has(c))?(l.flowId!==null&&this.persistent.delete(l.flowId),!1):!0)}setDisplay(e){this._display=e}particles(){var i;const e=this._display,t=this._theme,n=[];if(!e||!t){for(const a of this.flows)for(const o of a.particles)n.push({x:0,y:0,z:0,color:"#ffffff"});return n}const r=this.now();for(const a of this.flows){const o=hc(a.path,e),l=(t.flow.baseSpeed??0)*this._speedOf(a),c=o>0&&l>0?o/l:0,h=((i=this.store.flowTypes)==null?void 0:i[a.flowType])??null,f=Av(a,h,t),u=a.size??(h==null?void 0:h.size)??t.flow.size;for(const d of a.particles){const g=c>0?(r-d.born)/c:0,_=wv(a.path,g,e);_&&n.push({x:_.x,y:_.y,z:_.z,color:f,size:u})}}return n}prepare(e,t){this._display=e,this._theme=t}}class Pv{constructor(e,t,n){this.scene=e,this.store=t,this.controller=n,this.theme=null,this.capacity=0,this.mesh=null,this._matrix=new it,this._color=new Ye,this._ensureCapacity(1024)}_ensureCapacity(e){var i;if(this.mesh&&e<=this.capacity)return;const t=Math.max(1024,2**Math.ceil(Math.log2(Math.max(1,e))));this.mesh&&(this.scene.remove(this.mesh),this.mesh.geometry.dispose(),this.mesh.material.dispose(),this.mesh.dispose());const n=new Es(Tv,cc,cc),r=new pr({color:16777215,transparent:!0,opacity:((i=this.theme)==null?void 0:i.flow.opacity)??.85,blending:ls,depthWrite:!1});this.mesh=new jc(n,r,t),this.mesh.count=0,this.mesh.frustumCulled=!1,this.scene.add(this.mesh),this.capacity=t}applyTheme(e){this.theme=e,this.mesh&&(this.mesh.material.opacity=e.flow.opacity)}update(e,t,n){this.theme=t,this.controller.prepare(n,t),this.controller.update(e,t);const r=this.controller.particles();this._ensureCapacity(r.length);const i=this.mesh;for(let a=0;a<r.length;a+=1){const o=r[a],l=o.size??t.flow.size;this._matrix.makeScale(l,l,l),this._matrix.setPosition(o.x,o.y,o.z),i.setMatrixAt(a,this._matrix),this._color.set(o.color),i.setColorAt(a,this._color)}i.count=r.length,i.instanceMatrix.needsUpdate=!0,i.instanceColor&&(i.instanceColor.needsUpdate=!0)}particleCount(){return this.mesh?this.mesh.count:0}dispose(){this.mesh&&(this.scene.remove(this.mesh),this.mesh.geometry.dispose(),this.mesh.material.dispose(),this.mesh.dispose(),this.mesh=null)}}const Oa=12,Uv=.5;function Dv(s,e,t,n=Oa){const r=(s.x+e.x)/2,i=(s.y+e.y)/2,a=(s.z+e.z)/2;let o=r,l=i,c=a;const h=e.x-s.x,f=e.y-s.y,u=e.z-s.z,d=Math.hypot(h,f,u);if(t>0&&d>0){const _=h/d,p=f/d,m=u/d;let M=-m,v=0,b=_;Math.hypot(M,v,b)<1e-6&&(M=0,v=m,b=-p);const R=Math.hypot(M,v,b)||1,w=t*d*Uv;o=r+M/R*w,l=i+v/R*w,c=a+b/R*w}const g=[];for(let _=0;_<=n;_+=1){const p=_/n,m=1-p,M=m*m,v=2*m*p,b=p*p;g.push({x:M*s.x+v*o+b*e.x,y:M*s.y+v*l+b*e.y,z:M*s.z+v*c+b*e.z})}return g}const Lv=8,Iv=.75,uc=.6,Ti=600,fc="__default",dc={sphere:()=>new Es(3,12,8),box:()=>new ki(4.8,4.8,4.8),octahedron:()=>new Wa(3.6),tetrahedron:()=>new Xa(4.2)};class Fv{constructor(e,t,n,{onCameraReady:r=()=>{}}={}){this.container=e,this.store=t,this.engine=n,this.onCameraReady=r,this.display=new Map,this.theme=eh("modern"),this.scene=new qg,this.camera=null,this.controls=null,this.webgl=new jg({antialias:!0}),this.webgl.setSize(e.clientWidth,e.clientHeight),this.webgl.setPixelRatio(window.devicePixelRatio),e.appendChild(this.webgl.domElement),this.ambient=new i_,this.scene.add(this.ambient),this.sun=new n_,this.sun.position.set(1,2,3),this.scene.add(this.sun),this.meshes=new Map,this._counts=new Map,this.composer=null,this.bloomPass=null,this.bloomDisabled=!1,this.onFrame=null,this.edgeCapacity=0,this.edgeLines=null,this.edgeStyle="line",this.edgeElasticity=0,this._ensureEdgeCapacity(8192),this.clock=new Zc,this._matrix=new it,this.raycaster=new s_,this._pointer=new Oe,this._tmpColor=new Ye,this._bgColor=new Ye,this.frameIndex=0,this._boundsStamp=-1,this.highlightSet=null,this.focusId=null,this.focusElapsed=0,this._focusFrom=new V,this.labels=new Ev(this.scene,t,n),this.flowController=new Rv(t,{}),this.flows=new Pv(this.scene,t,this.flowController),this.applyTheme(this.theme),t.subscribe(i=>{i.kind==="init"&&!this.camera&&this._initCamera(t.config.dimensions)}),window.addEventListener("resize",()=>this._onResize())}applyTheme(e){this.theme=e,this._bgColor.set(e.background),this.scene.background=new Ye(e.background),this.ambient.color.set(e.lights.ambient.color),this.ambient.intensity=e.lights.ambient.intensity,this.sun.color.set(e.lights.directional.color),this.sun.intensity=e.lights.directional.intensity,this.edgeLines.material.color.set(e.edge.color),this.edgeLines.material.opacity=e.edge.opacity;for(const t of this.meshes.values())t.material.emissive.set(e.node.emissive),t.material.emissiveIntensity=e.node.emissiveIntensity;this.labels.applyTheme(e),this.flows.applyTheme(e),this._syncBloom()}setEdgeStyle({style:e,elasticity:t}={}){this.edgeStyle=e==="spline"?"spline":"line",this.edgeElasticity=Math.max(0,Math.min(1,t??0))}_syncBloom(){const e=!!(this.theme.bloom.enabled&&!this.bloomDisabled&&this.camera);if(e&&!this.composer){const t=new Oe;this.webgl.getSize(t),this.composer=new y_(this.webgl),this.composer.setPixelRatio(this.webgl.getPixelRatio()),this.composer.setSize(t.x,t.y),this.composer.addPass(new S_(this.scene,this.camera)),this.bloomPass=new Oi(t.clone(),this.theme.bloom.strength,this.theme.bloom.radius,this.theme.bloom.threshold),this.composer.addPass(this.bloomPass)}else!e&&this.composer?(this.bloomPass.dispose(),this.composer.dispose(),this.composer=null,this.bloomPass=null):this.composer&&(this.bloomPass.strength=this.theme.bloom.strength,this.bloomPass.radius=this.theme.bloom.radius,this.bloomPass.threshold=this.theme.bloom.threshold)}disableBloom(){this.bloomDisabled=!0,this._syncBloom()}setPixelRatio(e){var t;this.webgl.setPixelRatio(e),(t=this.composer)==null||t.setPixelRatio(e)}_initCamera(e){if(this.camera)return;const t=this.container.clientWidth/this.container.clientHeight;e===2?(this.camera=new Ss(-Ti*t,Ti*t,Ti,-Ti,-1e4,1e4),this.camera.position.set(0,0,1e3),this.controls=new jl(this.camera,this.webgl.domElement),this.controls.enableDamping=!0,this.controls.enableRotate=!1,this.controls.screenSpacePanning=!0,this.controls.mouseButtons={LEFT:_n.PAN,MIDDLE:_n.DOLLY,RIGHT:_n.PAN},this.controls.touches={ONE:Un.PAN,TWO:Un.DOLLY_PAN}):(this.camera=new Yt(60,t,1,5e4),this.camera.position.set(0,0,900),this.controls=new jl(this.camera,this.webgl.domElement),this.controls.enableDamping=!0,this.controls.minDistance=20,this.controls.maxDistance=2e4),this.onCameraReady()}_onResize(){var t,n;if(this.webgl.setSize(this.container.clientWidth,this.container.clientHeight),!this.camera)return;const e=this.container.clientWidth/this.container.clientHeight;this.camera.isOrthographicCamera?(this.camera.left=-Ti*e,this.camera.right=Ti*e):this.camera.aspect=e,this.camera.updateProjectionMatrix(),(t=this.composer)==null||t.setSize(this.container.clientWidth,this.container.clientHeight),(n=this.bloomPass)==null||n.setSize(this.container.clientWidth,this.container.clientHeight)}_ensureMesh(e,t,n){let r=this.meshes.get(e);if(r&&r.userData.shape===t&&n<=r.userData.capacity)return r;const i=Math.max(256,2**Math.ceil(Math.log2(Math.max(1,n))));r&&(this.scene.remove(r),r.geometry.dispose(),r.material.dispose(),r.dispose());const a=(dc[t]??dc.sphere)(),o=new $g({color:16777215,roughness:.4,emissive:new Ye(this.theme.node.emissive),emissiveIntensity:this.theme.node.emissiveIntensity});return r=new jc(a,o,i),r.count=0,r.userData={shape:t,capacity:i,ids:[],cursor:0},this.scene.add(r),this.meshes.set(e,r),r}_ensureEdgeCapacity(e){if(e<=this.edgeCapacity)return;const t=Math.max(8192,2**Math.ceil(Math.log2(e)));this.edgeLines&&(this.scene.remove(this.edgeLines),this.edgeLines.geometry.dispose(),this.edgeLines.material.dispose());const n=new zt;n.setAttribute("position",new jt(new Float32Array(t*3),3)),n.setDrawRange(0,0),this.edgeLines=new Qg(n,new qc({color:this.theme.edge.color,transparent:!0,opacity:this.theme.edge.opacity})),this.edgeLines.frustumCulled=!1,this.scene.add(this.edgeLines),this.edgeCapacity=t}start(){this.webgl.setAnimationLoop(()=>this._frame())}_frame(){const e=this.clock.getDelta();this.camera&&(this.frameIndex+=1,this.onFrame&&this.onFrame(e),this._syncNodes(e),this._syncEdges(),this.labels.update(e,this.camera,this.highlightSet,this.display),this.flows.update(e,this.theme,this.display),this._stepFocus(e),this.controls.update(),this._syncBloom(),this.composer?this.composer.render():this.webgl.render(this.scene,this.camera))}_meshKey(e){return e&&e.type!=null&&this.store.nodeTypes[e.type]?e.type:fc}_syncNodes(e){const{ids:t,positions:n}=this.engine,r=Math.min(t.length,n.length/3),i=Math.min(1,e*Lv),a=new Set;for(let o=0;o<r;o+=1){const l=t[o];a.add(l);const c=n[o*3],h=n[o*3+1],f=n[o*3+2];let u=this.display.get(l);u||(u=new V(c,h,f),this.display.set(l,u)),u.x+=(c-u.x)*i,u.y+=(h-u.y)*i,u.z+=(f-u.z)*i}for(const o of this.display.keys())a.has(o)||this.display.delete(o);this._counts.clear();for(let o=0;o<r;o+=1){const l=this._meshKey(this.store.nodes.get(t[o]));this._counts.set(l,(this._counts.get(l)??0)+1)}for(const[o,l]of this._counts){const c=o===fc?this.theme.node.shape:this.store.nodeTypes[o].shape??this.theme.node.shape,h=this._ensureMesh(o,c,l);h.userData.cursor=0,h.userData.ids.length=l}for(const[o,l]of this.meshes)this._counts.has(o)||(l.count=0,l.userData.ids.length=0);for(let o=0;o<r;o+=1){const l=t[o],c=this.store.nodes.get(l)??{id:l,type:null,meta:{}},h=this.meshes.get(this._meshKey(c)),f=h.userData.cursor;h.userData.cursor+=1,h.userData.ids[f]=l;const u=th(c,this.store.nodeTypes,this.theme),d=this.display.get(l);this._matrix.makeScale(u.size,u.size,u.size),this._matrix.setPosition(d.x,d.y,d.z),h.setMatrixAt(f,this._matrix),this._tmpColor.set(u.color),this.highlightSet!==null&&!this.highlightSet.has(l)&&this._tmpColor.lerp(this._bgColor,Iv),h.setColorAt(f,this._tmpColor)}for(const[o,l]of this.meshes)this._counts.has(o)&&(l.count=l.userData.cursor,l.instanceMatrix.needsUpdate=!0,l.instanceColor&&(l.instanceColor.needsUpdate=!0))}_syncEdges(){const{edges:e}=this.store,t=this.edgeStyle==="spline"&&this.edgeElasticity>0,n=t?Oa*2:2;this._ensureEdgeCapacity(e.size*n);const r=this.edgeLines.geometry.getAttribute("position");let i=0;for(const a of e.values()){const o=this.display.get(a.source),l=this.display.get(a.target);if(!(!o||!l))if(t){const c=Dv(o,l,this.edgeElasticity,Oa);for(let h=0;h<c.length-1;h+=1)r.setXYZ(i,c[h].x,c[h].y,c[h].z),i+=1,r.setXYZ(i,c[h+1].x,c[h+1].y,c[h+1].z),i+=1}else r.setXYZ(i,o.x,o.y,o.z),i+=1,r.setXYZ(i,l.x,l.y,l.z),i+=1}this.edgeLines.geometry.setDrawRange(0,i),r.needsUpdate=!0}nodeCount(){let e=0;for(const t of this.meshes.values())e+=t.count;return e}pick(e,t){if(!this.camera||this.meshes.size===0)return null;const n=this.webgl.domElement.getBoundingClientRect();if(this._pointer.x=(e-n.left)/n.width*2-1,this._pointer.y=-((t-n.top)/n.height)*2+1,this._boundsStamp!==this.frameIndex){for(const a of this.meshes.values())a.count>0&&a.computeBoundingSphere();this._boundsStamp=this.frameIndex}this.raycaster.setFromCamera(this._pointer,this.camera);const r=[...this.meshes.values()].filter(a=>a.count>0),i=this.raycaster.intersectObjects(r,!1)[0];return!i||i.instanceId===void 0?null:i.object.userData.ids[i.instanceId]??null}viewState(){if(!this.camera||!this.controls)return null;const e=this.camera.position,t=this.controls.target;return{position:{x:e.x,y:e.y,z:e.z},target:{x:t.x,y:t.y,z:t.z},zoom:this.camera.zoom}}setHighlight(e){this.highlightSet=e}focusOn(e){this.controls&&(this.focusId=e,this.focusElapsed=0,this._focusFrom.copy(this.controls.target))}_stepFocus(e){if(this.focusId===null)return;if(!this.store.nodes.has(this.focusId)){this.focusId=null;return}const t=this.display.get(this.focusId);if(!t)return;this.focusElapsed=Math.min(this.focusElapsed+e,uc);const n=this.focusElapsed/uc,r=1-(1-n)**3;this.controls.target.lerpVectors(this._focusFrom,t,r),n>=1&&(this.focusId=null)}}const os=new xh;function Nv(){try{const s=document.createElement("canvas");return!!(window.WebGLRenderingContext&&(s.getContext("webgl2")||s.getContext("webgl")))}catch{return!1}}function Ov(){const s=new cr,e=new u_(s);let t=null;const n=new Fh(document.getElementById("app"),s,()=>t);function r(g,_){const p=_??s.config.highlight_neighbors??1,m=Nh(s,g,p);i.setHighlight(m.size>0?m:null)}const i=new Fv(document.getElementById("app"),s,e,{onCameraReady:()=>{new h_(i.webgl.domElement,(_,p)=>i.pick(_,p),_=>d.send(_),{onNodeClick:_=>{var m;const p=s.config.highlight_neighbors??1;p>0&&r(_,p),i.focusOn(_),(m=s.config.detail_window)!=null&&m.open_on_click&&n.openFor(_)},onBackgroundClick:()=>{i.setHighlight(null)}}),new o_(i.camera,i.controls,{is2d:s.config.dimensions===2});const g=pc(()=>{const _=i.viewState();_&&d.send(Pi("view_change",_))},100);i.controls.addEventListener("change",g)}});function a(g){const _=eh(g);t=_,i.applyTheme(_),T_(_),n.applyTheme()}const o=g=>{g===1&&i.disableBloom(),g===2&&i.setPixelRatio(1)},l=new d_(o);s.subscribe(g=>{g.kind==="patch"&&n.onPatch(g.patch)}),s.subscribe(g=>{if(g.kind!=="init")return;i.flowController.replayInit(s.flows??[]),a(s.config.theme),i.setEdgeStyle(s.config.edge_style??{style:"line",elasticity:0});for(const p of s.windows??[])p.kind==="terminal"?n.openTerminal(p,h):n.openControl(p,c);s.config.title&&(document.title=`${s.config.title} – viewbase`);const _=s.config.quality??"auto";_==="low"?(o(1),o(2)):_==="auto"&&(i.onFrame=p=>l.frame(p))});function c(g){d.send(Pi("window_submit",g))}function h(g){d.send(Pi("terminal_input",g))}const f={show_detail:g=>n.openFor(g.node_id),focus:g=>i.focusOn(g.node_id),highlight:g=>r(g.node_id,g.depth),flow:g=>i.flowController.applyFlow(g),stop_flow:g=>i.flowController.stopFlow(g.flow_id),set_theme:g=>{s.config.theme=g.theme,a(g.theme)},open_window:g=>g.kind==="terminal"?n.openTerminal(g,h):n.openControl(g,c),close_window:g=>n.closeControl(g.window_id),terminal_append:g=>n.terminalAppend(g.window_id,g.text),set_edge_style:g=>i.setEdgeStyle(g)},u=location.protocol==="https:"?"wss":"ws",d=new vh(`${u}://${location.host}/ws`,s,{onStatus:g=>{g==="init"?os.hide():g==="close"?os.show("Spojení se serverem vypadlo – zkouším se znovu připojit…"):g==="protocol_mismatch"&&os.show("Server běží s jinou verzí protokolu – obnovte stránku (F5).")},onAction:g=>{const _=f[g.action];_?_(g):console.warn("viewbase: neznámá akce",g.action)}});d.connect(),i.start(),window.__viewbase={store:s,engine:e,renderer:i,connection:d,watchdog:l,windowManager:n,flowController:i.flowController,flowLayer:i.flows}}Nv()?Ov():os.show("Tento prohlížeč nemá dostupné WebGL – vizualizaci nelze spustit. Zkus jiný prohlížeč nebo zapni hardwarovou akceleraci.");
