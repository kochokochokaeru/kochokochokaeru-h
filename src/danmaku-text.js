/*
Copyright luojia@luojia.me
LGPL license

danmaku-frame text2d mod
*/
'use strict';

import '../lib/setImmediate/setImmediate.js'
import Text2d from './text2d.js'
import Text3d from './text3d.js'
import TextCanvas from './textCanvas.js'



/*
danmaku obj struct
{
	_:'text',
	time:(number)msec time,
	text:(string),
	style:(object)to be combined whit default style,
	mode:(number)
}

danmaku mode
	0:right
	1:left
	2:bottom
	3:top
*/

function init(DanmakuFrame,DanmakuFrameModule){
	const defProp=Object.defineProperty;
	const requestIdleCallback=window.requestIdleCallback||setImmediate;
	let useImageBitmap=false;

	class TextDanmaku extends DanmakuFrameModule{
		constructor(frame,arg={}){
			super(frame);
			const D=this;
			D.list=[];//danmaku object array
			D.indexMark=0;//to record the index of last danmaku in the list
			D.tunnel=new tunnelManager();
			D.paused=true;
			D.randomText=`danmaku_text_${(Math.random()*999999)|0}`;
			
			//opt time record
			D.cacheCleanTime=0;
			D.danmakuMoveTime=0;
			D.danmakuCheckTime=0;
			D.danmakuCheckSwitch=true;
			D.defaultStyle={//these styles can be overwrote by the 'font' property of danmaku object
				fontStyle: null,
				fontWeight: 300,
				fontVariant: null,
				color: "#fff",
				fontSize: 24,
				fontFamily: "Arial",
				strokeWidth: 1,//outline width
				strokeColor: "#888",
				shadowBlur: 5,
				textAlign:'start',//left right center start end
				shadowColor: "#000",
				shadowOffsetX:0,
				shadowOffsetY:0,
				fill:true,//if the text should be filled
			};
			D.options={
				allowLines:false,//allow multi-line danmaku
				screenLimit:0,//the most number of danmaku on the screen
				clearWhenTimeReset:true,//clear danmaku on screen when the time is reset
				speed:6.5,
				autoShiftRenderingMode:true,//auto shift to a low load mode
			}

			if(arg.defaultStyle)
				Object.assign(this.defaultStyle,arg.defaultStyle);
			if(arg.options)
				Object.assign(this.options,arg.options);
			
			frame.addStyle(`.${D.randomText}_fullfill{top:0;left:0;width:100%;height:100%;position:absolute;}`);

			defProp(D,'rendererMode',{configurable:true});
			defProp(D,'activeRendererMode',{configurable:true,value:null});
			const con=D.container=document.createElement('div');
			con.classList.add(`${D.randomText}_fullfill`);
			frame.container.appendChild(con);

			//init modes
			D.text2d=new Text2d(D);
			D.text3d=new Text3d(D);
			D.textCanvas=new TextCanvas(D);
			
			D.textCanvasContainer.hidden=D.canvas.hidden=D.canvas3d.hidden=true;
			D.modes={
				1:D.textCanvas,
				2:D.text2d,
				3:D.text3d,
			};
			D.GraphCache=[];//text graph cache
			D.DanmakuText=[];
			D.renderingDanmakuManager=new renderingDanmakuManager(D);

			addEvents(document,{
				visibilitychange:e=>{
					D.danmakuCheckSwitch=!document.hidden;
					if(!document.hidden)D.recheckIndexMark();
				}
			});
			D._checkNewDanmaku=D._checkNewDanmaku.bind(D);
			D._cleanCache=D._cleanCache.bind(D);
			setInterval(D._cleanCache,5000);//set an interval for cache cleaning
			
			D.setRendererMode(1);
		}
		setRendererMode(n){
			const D=this;
			if(D.rendererMode===n || !(n in D.modes) || !D.modes[n].supported)return false;
			D.activeRendererMode&&D.activeRendererMode.disable();
			defProp(D,'activeRendererMode',{value:D.modes[n]});
			defProp(D,'rendererMode',{value:n});
			D.activeRendererMode.resize();
			D.activeRendererMode.enable();
			console.log('rendererMode:',D.rendererMode);
			return true;
		}
		media(media){
			const D=this;
			addEvents(media,{
				seeked:()=>{
					D.time();
					D._clearScreen(true);
				},
				seeking:()=>D.pause(),
			});
		}
		start(){
			this.paused=false;
			//this.recheckIndexMark();
			this.activeRendererMode.start();
		}
		pause(){
			this.paused=true;
			this.activeRendererMode.pause();
		}
		load(d,autoAddToScreen){
			if(!d || d._!=='text'){return false;}
			if(typeof d.text !== 'string'){
				console.error('wrong danmaku object:',d);
				return false;
			}
			let t=d.time,ind,arr=this.list;
			ind=dichotomy(arr,d.time,0,arr.length-1,false)
			arr.splice(ind,0,d);
			if(ind<this.indexMark)this.indexMark++;
			//round d.style.fontSize to prevent Iifinity loop in tunnel
			if(typeof d.style!=='object')d.style={};
			d.style.fontSize=d.style.fontSize?((d.style.fontSize+0.5)|0):this.defaultStyle.fontSize;
			if(isNaN(d.style.fontSize)|| d.style.fontSize===Infinity || d.style.fontSize===0)d.style.fontSize=this.defaultStyle.fontSize;
			if(typeof d.mode !== 'number')d.mode=0;
			if(autoAddToScreen){
				console.log(ind,this.indexMark)
			}
			if(autoAddToScreen&&(ind<this.indexMark))this._addNewDanmaku(d);
			return d;
		}
		loadList(danmakuArray){
			danmakuArray.forEach(d=>this.load(d));
		}
		unload(d){
			if(!d || d._!=='text')return false;
			const D=this,i=D.list.indexOf(d);
			if(i<0)return false;
			D.list.splice(i,1);
			if(i<D.indexMark)D.indexMark--;
			return true;
		}
		_checkNewDanmaku(force){
			if(this.paused&&!force)return;
			let D=this,d,time=D.frame.time;
			if(D.danmakuCheckTime===time || !D.danmakuCheckSwitch)return;
			if(D.danmakuCheckTime<time-5000){
				this.recheckIndexMark(time-5000);//ignore danmakus expired over 5 sec
			}
			if(D.list.length)
			for(;(D.indexMark<D.list.length)&&(d=D.list[D.indexMark])&&(d.time<=time);D.indexMark++){//add new danmaku
				if(D.options.screenLimit>0 && D.DanmakuText.length>=D.options.screenLimit){continue;}//continue if the number of danmaku on screen has up to limit or doc is not visible
				D._addNewDanmaku(d);
			}
			D.danmakuCheckTime=time;
		}
		_addNewDanmaku(d){
			const D=this,cHeight=D.height,cWidth=D.width;
			let t=D.GraphCache.length?D.GraphCache.shift():new TextGraph();
			t.danmaku=d;
			t.drawn=false;
			t.text=D.options.allowLines?d.text:d.text.replace(/\n/g,' ');
			t.time=d.time;
			t.font=Object.create(D.defaultStyle);
			Object.assign(t.font,d.style);
			if(!t.font.lineHeight)t.font.lineHeight=(t.font.fontSize+2)||1;
			if(d.style.color){
				if(t.font.color && t.font.color[0]!=='#'){
					t.font.color='#'+d.style.color;
				}
			}

			if(d.mode>1)t.font.textAlign='center';
			t.prepare(D.rendererMode===3?false:true);
			//find tunnel number
			const tnum=D.tunnel.getTunnel(t,cHeight);
			//calc margin
			let margin=(tnum<0?0:tnum)%cHeight;
			switch(d.mode){
				case 0:case 1:case 3:{
					t.style.y=margin;break;
				}
				case 2:{
					t.style.y=cHeight-margin-t.style.height-1;
				}
			}
			switch(d.mode){
				case 0:{t.style.x=cWidth;break;}
				case 1:{t.style.x=-t.style.width;break;}
				case 2:case 3:{t.style.x=(cWidth-t.style.width)/2;}
			}
			D.renderingDanmakuManager.add(t);
			D.activeRendererMode.newDanmaku(t);
		}
		_calcSideDanmakuPosition(t,T=this.frame.time){
			let R=!t.danmaku.mode,style=t.style;
			return (R?this.frame.width:(-style.width))
					+(R?-1:1)*this.frame.rate*(style.width+1024)*(T-t.time)*this.options.speed/60000;
		}
		_calcDanmakusPosition(force){
			let D=this,T=D.frame.time;
			if(D.paused&&!force)return;
			const cWidth=D.width,rate=D.frame.rate;
			let R,i,t,style,X;
			D.danmakuMoveTime=T;
			for(i=D.DanmakuText.length;i--;){
				t=D.DanmakuText[i];
				if(t.time>T){
					D.removeText(t);
					continue;
				}
				style=t.style;

				switch(t.danmaku.mode){
					case 0:case 1:{
						R=!t.danmaku.mode;
						style.x=X=D._calcSideDanmakuPosition(t,T);
						if(t.tunnelNumber>=0 && ((R&&(X+style.width)+10<cWidth) || (!R&&X>10)) ){
							D.tunnel.removeMark(t);
						}else if( (R&&(X<-style.width-20)) || (!R&&(X>cWidth+style.width+20)) ){//go out the canvas
							D.removeText(t);
							continue;
						}
						break;
					}
					case 2:case 3:{
						if((T-t.time)>D.options.speed*1000/rate){
							D.removeText(t);
						}
					}
				}
			}
		}
		_cleanCache(force){//clean text object cache
			const D=this,now=Date.now();
			if(D.GraphCache.length>30 || force){//save 20 cached danmaku
				for(let ti = 0;ti<D.GraphCache.length;ti++){
					if(force || (now-D.GraphCache[ti].removeTime) > 10000){//delete cache which has not used for 10s
						D.activeRendererMode.deleteTextObject(D.GraphCache[ti]);
						D.GraphCache.splice(ti,1);
					}else{break;}
				}
			}
		}
		draw(force){
			if((!force&&this.paused)||!this.enabled)return;
			this._calcDanmakusPosition(force);
			this.activeRendererMode.draw(force);
			requestAnimationFrame(()=>{this._checkNewDanmaku(force)});
		}
		removeText(t){//remove the danmaku from screen
			this.renderingDanmakuManager.remove(t);
			this.tunnel.removeMark(t);
			t._bitmap=t.danmaku=null;
			t.removeTime=Date.now();
			this.GraphCache.push(t);
			this.activeRendererMode.remove(t);
		}
		resize(){
			if(this.activeRendererMode)this.activeRendererMode.resize();
			this.draw(true);
		}
		_clearScreen(forceFull){
			this.activeRendererMode&&this.activeRendererMode.clear(forceFull);
		}
		clear(){//clear danmaku on the screen
			for(let i=this.DanmakuText.length,T;i--;){
				T=this.DanmakuText[i];
				if(T.danmaku)this.removeText(T);
			}
			this.tunnel.reset();
			this._clearScreen(true);
		}
		recheckIndexMark(t=this.frame.time){
			this.indexMark=dichotomy(this.list,t,0,this.list.length-1,true);
		}
		rate(r){
			if(this.activeRendererMode)this.activeRendererMode.rate(r);
		}
		time(t=this.frame.time){//reset time,you should invoke it when the media has seeked to another time
			this.recheckIndexMark(t);
			if(this.options.clearWhenTimeReset){this.clear();}
			else{this.resetTimeOfDanmakuOnScreen();}
		}
		resetTimeOfDanmakuOnScreen(cTime=this.frame.time){
			//cause the position of the danmaku is based on time
			//and if you don't want these danmaku on the screen to disappear after seeking,their time should be reset
			this.DanmakuText.forEach(t=>{
				if(!t.danmaku)return;
				t.time=cTime-(this.danmakuMoveTime-t.time);
			});
		}
		danmakuAt(x,y){//return a list of danmaku which covers this position
			const list=[];
			if(!this.enabled)return list;
			this.DanmakuText.forEach(t=>{
				if(!t.danmaku)return;
				if(t.style.x<=x && t.style.x+t.style.width>=x && t.style.y<=y && t.style.y+t.style.height>=y)
					list.push(t.danmaku);
			});
			return list;
		}
		enable(){//enable the plugin
			this.textCanvasContainer.hidden=false;
			if(this.frame.working)this.start();
		}
		disable(){//disable the plugin
			this.textCanvasContainer.hidden=true;
			this.pause();
			this.clear();
		}
		set useImageBitmap(v){
			useImageBitmap=(typeof createImageBitmap ==='function')?v:false;
		}
		get useImageBitmap(){return useImageBitmap;}
		get width(){return this.frame.width;}
		get height(){return this.frame.height;}
	}


	class TextGraph{//code copied from CanvasObjLibrary
		constructor(text=''){
			const G=this;
			G._fontString='';
			G._renderList=null;
			G.style={};
			G.font={};
			G.text=text;
			G._renderToCache=G._renderToCache.bind(G);
			defProp(G,'_cache',{configurable:true});
		}
		prepare(async=false){//prepare text details
			const G=this;
			if(!G._cache){
				defProp(G,'_cache',{value:document.createElement("canvas")});
			}
			let ta=[];
			(G.font.fontStyle)&&ta.push(G.font.fontStyle);
			(G.font.fontVariant)&&ta.push(G.font.fontVariant);
			(G.font.fontWeight)&&ta.push(G.font.fontWeight);
			ta.push(`${G.font.fontSize}px`);
			(G.font.fontFamily)&&ta.push(G.font.fontFamily);
			G._fontString = ta.join(' ');

			const imgobj = G._cache,ct = (imgobj.ctx2d||(imgobj.ctx2d=imgobj.getContext("2d")));
			ct.font = G._fontString;
			G._renderList = G.text.split(/\n/g);
			G.estimatePadding=Math.max(
				G.font.shadowBlur+5+Math.max(Math.abs(G.font.shadowOffsetY),Math.abs(G.font.shadowOffsetX)),
				G.font.strokeWidth+3
			);
			let w = 0,tw,lh=(typeof G.font.lineHeight ==='number')?G.font.lineHeight:G.font.fontSize;
			for (let i = G._renderList.length; i -- ;) {
				tw = ct.measureText(G._renderList[i]).width;
				(tw>w)&&(w=tw);//max
			}
			imgobj.width = (G.style.width = w) + G.estimatePadding*2;
			imgobj.height = (G.style.height = G._renderList.length * lh)+ ((lh<G.font.fontSize)?G.font.fontSize*2:0) + G.estimatePadding*2;

			ct.translate(G.estimatePadding, G.estimatePadding);
			if(async){
				requestIdleCallback(G._renderToCache);
			}else{
				G._renderToCache();
			}
		}
		_renderToCache(){
			const G=this;
			if(!G.danmaku)return;
			G.render(G._cache.ctx2d);
			if(useImageBitmap){//use ImageBitmap
				if(G._bitmap){
					G._bitmap.close();
					G._bitmap=null;
				}
				createImageBitmap(G._cache).then(bitmap=>{
					G._bitmap=bitmap;
				});
			}
		}
		render(ct){//render text
			const G=this;
			if(!G._renderList)return;
			ct.save();
			if(G.danmaku.highlight){
				ct.fillStyle='rgba(255,255,255,0.3)';
				ct.beginPath();
				ct.rect(0,0,G.style.width,G.style.height);
				ct.fill();
			}
			ct.font=G._fontString;//set font
			ct.textBaseline = 'middle';
			ct.lineWidth = G.font.strokeWidth;
			ct.fillStyle = G.font.color;
			ct.strokeStyle = G.font.strokeColor;
			ct.shadowBlur = G.font.shadowBlur;
			ct.shadowColor= G.font.shadowColor;
			ct.shadowOffsetX = G.font.shadowOffsetX;
			ct.shadowOffsetY = G.font.shadowOffsetY;
			ct.textAlign = G.font.textAlign;
			let lh=(typeof G.font.lineHeight ==='number')?G.font.lineHeight:G.font.fontSize,
				x;
			switch(G.font.textAlign){
				case 'left':case 'start':{
					x=0;break;
				}
				case 'center':{
					x=G.style.width/2;break;
				}
				case 'right':case 'end':{
					x=G.style.width;
				}
			}
			for (let i = G._renderList.length;i--;) {
				G.font.strokeWidth&&ct.strokeText(G._renderList[i],x,lh*(i+0.5));
				G.font.fill&&ct.fillText(G._renderList[i],x, lh*(i+0.5));
			}
			ct.restore();
		}
	}

	class tunnelManager{
		constructor(){
			this.reset();
		}
		reset(){
			this.right={};
			this.left={};
			this.bottom={};
			this.top={};
		}
		getTunnel(tobj,cHeight){//get the tunnel index that can contain the danmaku of the sizes
			let tunnel=this.tunnel(tobj.danmaku.mode),
				size=tobj.style.height,
				ti=0,
				tnum=-1;
			if(typeof size !=='number' || size<=0){
				console.error('Incorrect size:'+size);
				size=24;
			}
			if(size>cHeight)return 0;

			while(tnum<0){
				for(let t=ti+size-1;ti<=t;){
					if(tunnel[ti]){//used
						ti+=tunnel[ti].tunnelHeight;
						break;
					}else if((ti!==0)&&(ti%(cHeight-1))===0){//new page
						ti++;
						break;
					}else if(ti===t){//get
						tnum=ti-size+1;
						break;
					}else{
						ti++;
					}
				}
			}
			tobj.tunnelNumber=tnum;
			tobj.tunnelHeight=(((tobj.style.y+size)>cHeight)?1:size);
			this.addMark(tobj);
			return tnum;
		}
		addMark(tobj){
			let t=this.tunnel(tobj.danmaku.mode);
			if(!t[tobj.tunnelNumber])t[tobj.tunnelNumber]=tobj;
		}
		removeMark(tobj){
			let t,tun=tobj.tunnelNumber;
			if(tun>=0&&(t=this.tunnel(tobj.danmaku.mode))[tun]===tobj){
				delete t[tun];
				tobj.tunnelNumber=-1;
			}
		}
		tunnel(id){
			return this[tunnels[id]];
		}
	}

	const tunnels=['right','left','bottom','top'];

	class renderingDanmakuManager{
		constructor(dText){
			this.dText=dText;
			this.totalArea=0;
			this.limitArea=Infinity;
			if(dText.text2d.supported)this.timer=setInterval(()=>this.rendererModeCheck(),1500);
		}
		add(t){
			this.dText.DanmakuText.push(t);
			this.totalArea+=t._cache.width*t._cache.height;
		}
		remove(t){
			let ind=this.dText.DanmakuText.indexOf(t);
			if(ind>=0){
				this.dText.DanmakuText.splice(ind,1);
				this.totalArea-=t._cache.width*t._cache.height;
			}
		}
		rendererModeCheck(){
			let D=this.dText;
			if(!this.dText.options.autoShiftRenderingMode || D.paused)return;
			if(D.frame.fpsRec<(D.frame.fps||60)*0.95){
				(this.limitArea>this.totalArea)&&(this.limitArea=this.totalArea);
			}else{
				(this.limitArea<this.totalArea)&&(this.limitArea=this.totalArea);
			}
			if(D.rendererMode==1 && this.totalArea>this.limitArea){
				D.text2d.supported&&D.setRendererMode(2);
			}else if(D.rendererMode==2&& this.totalArea<this.limitArea*0.5){
				D.textCanvas.supported&&D.setRendererMode(1);
			}
		}
	}

	function dichotomy(arr,t,start,end,position=false){
		if(arr.length===0)return 0;
		let m=start,s=start,e=end;
		while(start <= end){//dichotomy
			m=(start+end)>>1;
			if(t<=arr[m].time)end=m-1;
			else{start=m+1;}
		}
		if(position){//find to top
			while(start>0 && (arr[start-1].time===t)){
				start--;
			}
		}else{//find to end
			while(start<=e && (arr[start].time===t)){
				start++;
			}
		}
		return start;
	}

	DanmakuFrame.addModule('TextDanmaku',TextDanmaku);
};

function addEvents(target,events={}){
	for(let e in events)e.split(/\,/g).forEach(e2=>target.addEventListener(e2,events[e]));
}
function limitIn(num,min,max){//limit the number in a range
	return num<min?min:(num>max?max:num);
}
function emptyFunc(){}
export default init;