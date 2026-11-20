import test from 'node:test';
import assert from 'node:assert/strict';
import { allowed, readPublic } from './public-browser-read.mjs';
const url = 'https://gustavanderson.notion.site/' + 'a'.repeat(32);
const input = {url,allowedUrls:[url],markers:['OSM:log','1.2.0']};

test('only explicit public Notion pages can launch a browser', async () => {
  for (const value of [{...input,url:'https://example.com/'}, {...input,allowedUrls:[]}, {...input,url:'http://gustavanderson.notion.site/'+'a'.repeat(32)}, {...input,markers:[]}]) {
    assert.equal(allowed(value),false);
    assert.equal((await readPublic(value,()=>{throw Error('must not launch');})).ok,false);
  }
});

const fake = ({text='OSM:log version 1.2.0',final=url,status=200}={}) => {
  let closed = false;
  return {closed:()=>closed, launch:async()=>({close:async()=>{closed=true;},newContext:async()=>({newPage:async()=>({
    goto:async()=>({status:()=>status}),waitForFunction:async()=>{},url:()=>final,
    locator:()=>({innerText:async()=>text}),
  })})})};
};

test('rendered visible content is returned from a fresh context and the browser closes',async()=>{
  const browser=fake(); const result=await readPublic(input,browser.launch);
  assert.equal(result.ok,true);assert.equal(result.url,url);assert.ok(browser.closed());
});

test('a login, shell, different page, redirect or bad response never verifies',async()=>{
  for(const value of [{text:'Log in'}, {text:'JavaScript is required'}, {final:'https://app.notion.com/login'},
    {final:'https://gustavanderson.notion.site/'+'b'.repeat(32)}, {status:403}]) {
    const browser=fake(value);assert.equal((await readPublic(input,browser.launch)).ok,false);assert.ok(browser.closed());
  }
});
