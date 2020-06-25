#!/usr/bin/env node

const request = require('axios'),
      yargs = require('yargs'),
      R = require('ramda');

const yargv = yargs
  .scriptName('elastic-scroll')
  .usage('$0 <cmd> [args]')
  .option('uri', {
    type: 'string',
    description: 'Uri to elasticsearch'
  })
  .option('index', {
    type: 'string',
    alias: 'i',
    description: 'Index to search'
  })
  .option('query', {
    type: 'string',
    alias: 'q',
    description: 'Query to run'
  })
  .demandOption(['uri', 'index', 'query'], 'Please provide mandatory options')
  .help()
  .argv

const query = yargv.query;
const uri = yargv.uri;
const index = yargv.index;

const isNonEmptyResult = R.pipe(R.path(['hits', 'hits']), R.complement(R.isEmpty));

function scroll(uri, scroll_id, fn) {
  return request({
      url: `${uri}/_search/scroll`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({ scroll: "1m", scroll_id }),
      responseType: 'json'
    })
    .then(R.prop('data'))
    .then(R.when(
      isNonEmptyResult,
      R.tap(R.pipe(
        R.path(['hits', 'hits']),
        R.map(R.prop('_source')),
        fn
      ))
    ))
    .then(R.when(isNonEmptyResult, ({ _scroll_id }) => scroll(uri, _scroll_id, fn)));
}

function search(uri, index, query, fn) {
  return request({
      url: `${uri}/${index}/_search?scroll=1m`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      data: query,
      responseType: 'json'
    })
    .then(R.prop('data'))
    .then(R.tap(R.pipe(
      R.path(['hits', 'hits']),
      R.map(R.prop('_source')),
      fn
    )))
    .then(({ _scroll_id }) => scroll(uri, _scroll_id, fn));
}

search(uri, index, query, R.pipe(
  R.map(JSON.stringify),
  R.join('\n'),
  console.log
))
.catch(e => {
  if (e.response) {
    console.error(e.response.status, e.response.statusText);
    console.error(JSON.stringify(e.response.data, null, 2));
  } else {
    console.error(e);
  }
  process.exit(1);
});
