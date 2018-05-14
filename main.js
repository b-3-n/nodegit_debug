'use strict';

const NodeGit = require('nodegit');
const Queue = require('./queue');
const fs = require('fs');

const FetchQueue = new Queue(async (fetchFn) => {
  return await fetchFn();
}, 8);

const lines = fs.readFileSync('repos', 'utf8').split('\n');

lines.forEach(async line => {
  const [owner, repo, oid] = line.split('/');

  let gitRepo;
  // I found using this queue data structure to be necessary to trigger the error.
  await FetchQueue.Enqueue(async () => {
    const cloneDir = `/tmp/clone/${owner}/${repo}`
    const gitURL = `https://github.com/${owner}/${repo}`;
    gitRepo = await NodeGit.Clone(gitURL, cloneDir);
  }); 
  // I found this to be necessary to trigger the error.
  await gitRepo.getCommit(oid);
});
