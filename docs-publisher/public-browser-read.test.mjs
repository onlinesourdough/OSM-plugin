import test from 'node:test';
import assert from 'node:assert/strict';
import { allowed, readPublic, readPublicBatch, retryDelay } from './public-browser-read.mjs';
const url = 'https://gustavanderson.notion.site/' + 'a'.repeat(32);
const other = 'https://gustavanderson.notion.site/' + 'b'.repeat(32);
const input = {url,allowedUrls:[url],markers:['OSM:log','1.2.0']};
const batch = {allowedUrls:[url,other],requests:[{url,markers:input.markers},{url:other,markers:['OSM:setup']}]};
const fast = {sleep:async()=>{}};

const fake = ({text='OSM:log version 1.2.0 OSM:setup',final,statuses=[200],retryAfter='1',throwContent=false,snapshotFinal,links=[]}={}) => {
  const counts = {launch:0,context:0,page:0,goto:0,close:0};
  let current=url, index=0, contextOptions;
  return {counts,options:()=>contextOptions,launch:async()=>{
    counts.launch++;
    return {close:async()=>{counts.close++;},newContext:async options=>{
      contextOptions=options;counts.context++;
      return {newPage:async()=>{counts.page++;return {
        goto:async value=>{current=value;counts.goto++;const status=statuses[Math.min(index++,statuses.length-1)];return {status:()=>status,headers:()=>({'retry-after':retryAfter}),url:()=>current};},
        waitForFunction:async()=>{if(throwContent)throw Error('fixture-only');},url:()=>final||current,
        locator:()=>({innerText:async()=>text}), evaluate:async()=>({url:snapshotFinal||final||current,text,links}),
      };}};
    }};
  }};
};

test('only a fully explicit public Notion page set can launch a browser', async () => {
  for (const value of [{...input,url:'https://example.com/'}, {...input,allowedUrls:[]}, {...input,url:'http://gustavanderson.notion.site/'+'a'.repeat(32)},
    {...input,markers:[]},{...input,markers:[7]},{...input,allowedUrls:[url,'https://example.com/']},{...input,allowedUrls:[url,url]}]) {
    assert.equal(allowed(value),false);
    assert.equal((await readPublic(value,()=>{throw Error('must not launch');})).ok,false);
  }
  for(const value of [{...batch,requests:[...batch.requests,{url:'https://example.com',markers:['OSM']}]},
    {...batch,requests:[batch.requests[0],batch.requests[0]]}]) {
    assert.equal((await readPublicBatch(value,()=>{throw Error('must not launch');},fast)).ok,false);
  }
});

test('single read stays compatible and always closes its fresh anonymous context',async()=>{
  const browser=fake(); const result=await readPublic(input,browser.launch,fast);
  assert.equal(result.ok,true);assert.equal(result.url,url);assert.equal(browser.counts.close,1);
  assert.deepEqual(browser.options(),{acceptDownloads:false,viewport:{width:1280,height:10000}});
});

test('a whole batch shares one fresh browser, context and page',async()=>{
  const browser=fake();const result=await readPublicBatch(batch,browser.launch,fast);
  assert.equal(result.ok,true);assert.deepEqual(result.results.map(row=>row.url),[url,other]);
  assert.deepEqual(browser.counts,{launch:1,context:1,page:1,goto:2,close:1});
});

test('a login, shell, different page, redirect or bad response never verifies',async()=>{
  for(const value of [{text:'Log in'}, {text:'JavaScript is required'}, {final:'https://app.notion.com/login'},
    {final:other}, {statuses:[403]}, {text:'x'.repeat(2_000_001)}]) {
    const browser=fake(value);assert.equal((await readPublic(input,browser.launch,fast)).ok,false);assert.equal(browser.counts.close,1);
  }
});

test('partial failures stay tied to their own URL and do not verify the batch',async()=>{
  const browser=fake({statuses:[200,403]});const result=await readPublicBatch(batch,browser.launch,fast);
  assert.equal(result.ok,false);assert.equal(result.results[0].ok,true);assert.equal(result.results[1].ok,false);
  assert.equal(result.results[1].url,other);
});

test('429 respects a bounded Retry-After, retries once, and never spins',async()=>{
  const sleeps=[];
  const browser=fake({statuses:[429,200],retryAfter:'3'});
  assert.equal((await readPublic(input,browser.launch,{sleep:async ms=>sleeps.push(ms)})).ok,true);
  assert.deepEqual(sleeps,[3000]);assert.equal(browser.counts.goto,2);
  const repeated=fake({statuses:[429]});
  assert.equal((await readPublic(input,repeated.launch,fast)).ok,false);assert.equal(repeated.counts.goto,2);
  const excessive=fake({statuses:[429],retryAfter:'61'});
  assert.equal((await readPublic(input,excessive.launch,fast)).reason,'Public page was rate limited; retry later');
  assert.equal(excessive.counts.goto,1);
  assert.equal(retryDelay('Fri, 20 Nov 2026 12:00:30 GMT',Date.parse('2026-11-20T12:00:00Z')),30000);
  assert.equal(retryDelay('invalid',Date.now()),null);
});

test('deadline prevents further navigation and reports every remaining URL as failed',async()=>{
  let now=0;
  const browser=fake({statuses:[429]});
  const result=await readPublicBatch(batch,browser.launch,{now:()=>now,sleep:async()=>{now+=270001;}});
  assert.equal(result.ok,false);assert.equal(result.results.length,2);assert.equal(browser.counts.goto,1);
  assert.ok(result.results.every(row=>row.reason==='Public browser run reached its time limit'));
});

test('content failure emits safe indexes and only opt-in public text',async()=>{
  for(const diagnostics of [false,true]){
    const result=await readPublic({...input,diagnostics},fake({text:'OSM:log',throwContent:true}).launch,fast);
    assert.equal(result.ok,false);assert.equal(result.reason,'Public browser failed during content');
    assert.deepEqual(result.missingMarkerIndexes,[1]);
    assert.equal(Object.hasOwn(result,'observedText'),diagnostics);
    assert.equal(JSON.stringify(result).includes('fixture-only'),false);
  }
});


test('capture binds the body and its document URL atomically',async()=>{
  const browser=fake({snapshotFinal:other});
  assert.equal((await readPublic(input,browser.launch,fast)).reason,'Public page changed host or page identity');
});

test('catalogue names in prose cannot substitute for visible links to the exact skills',async()=>{
  const catalogue={...input,entries:[{page:'b'.repeat(32),title:'OSM:setup'}]};
  assert.equal((await readPublic(catalogue,fake().launch,fast)).ok,false);
  assert.equal((await readPublic(catalogue,fake({links:[{url:other,title:'OSM:setup'}]}).launch,fast)).ok,true);
  for(const links of [[{url:url,title:'OSM:setup'}],[{url:other,title:'Unrelated'}],[{url:other,title:'osm set-up'}]])
    assert.equal((await readPublic(catalogue,fake({links}).launch,fast)).ok,false);
});

test('a server backoff that cannot be honoured stops the rest of the batch',async()=>{
  for(const value of [{statuses:[429],retryAfter:'120'},{statuses:[429,429,200],retryAfter:'45'}]){
    const browser=fake(value),result=await readPublicBatch(batch,browser.launch,fast);
    assert.equal(result.ok,false);
    assert.equal(browser.counts.goto,value.retryAfter==='120'?1:2);
    assert.ok(result.results.every(row=>row.reason==='Public page was rate limited; retry later'));
  }
});

test('a remaining budget shorter than the inter-page delay cannot bypass pacing',async()=>{
  let clock=0;
  const browser=fake(),launch=async()=>{
    const driver=await browser.launch();
    const context=await driver.newContext({});
    const page=await context.newPage(),capture=page.evaluate;
    page.evaluate=async()=>{const result=await capture();clock=260000;return result;};
    driver.newContext=async()=>({newPage:async()=>page});
    return driver;
  };
  const result=await readPublicBatch(batch,launch,{now:()=>clock,sleep:async ms=>{clock+=ms;}});
  assert.equal(browser.counts.goto,1);assert.equal(result.results[1].reason,'Public browser run reached its time limit');
});

test('a stalled graceful close is not returned as verified',async()=>{
  const browser=fake(),launch=async()=>({...await browser.launch(),close:()=>new Promise(()=>{})});
  const result=await readPublic(input,launch,{...fast,shutdownMs:1});
  assert.equal(result.ok,false);assert.equal(result.reason,'Public browser failed during shutdown');
});


test('a final capture after the deadline cannot verify',async()=>{
  let clock=0;
  const browser=fake(),launch=async()=>{
    const driver=await browser.launch(),context=await driver.newContext({}),page=await context.newPage(),capture=page.evaluate;
    page.evaluate=async()=>{const result=await capture();clock=270001;return result;};
    driver.newContext=async()=>({newPage:async()=>page});return driver;
  };
  assert.equal((await readPublic(input,launch,{now:()=>clock,sleep:async()=>{}})).ok,false);
});

test('the DOM capture requires native visibility including opacity',async()=>{
  let visible=false;
  const previous={window:globalThis.window,document:globalThis.document};
  const browser=fake(),launch=async()=>{
    const driver=await browser.launch(),context=await driver.newContext({}),page=await context.newPage();
    page.evaluate=async fn=>{
      globalThis.window={location:{href:url}};
      globalThis.document={body:{innerText:'OSM:log 1.2.0 OSM:setup'},querySelectorAll:()=>[{
        href:other,innerText:'OSM:setup',checkVisibility:options=>{
          assert.deepEqual(options,{checkOpacity:true,checkVisibilityCSS:true});return visible;
        },
      }]};
      try{return fn();}finally{globalThis.window=previous.window;globalThis.document=previous.document;}
    };
    driver.newContext=async()=>({newPage:async()=>page});return driver;
  };
  const catalogue={...input,entries:[{page:'b'.repeat(32),title:'OSM:setup'}]};
  assert.equal((await readPublic(catalogue,launch,fast)).ok,false);
  visible=true;assert.equal((await readPublic(catalogue,launch,fast)).ok,true);
});
