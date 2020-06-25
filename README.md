# Elastic scrolling cli

Simple cli to scroll data from elastic search.

## Usage

Example
```
$ elastic-scroll --uri http://localhost:9200 --index myindex --query '{"query":{"match_all":{}}}'
{"foo":"bar"}
{"foo":"baz"}
```

The output is new line seperated json, `x-ndjson`, each line is the content of `_source`.
