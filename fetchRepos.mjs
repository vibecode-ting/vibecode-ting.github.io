import fs from 'fs';
import https from 'https';

// Make sure to set this in your environment or replace temporarily to run
const PAT = process.env.GITHUB_PAT;

function fetchGithub(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Node.js',
        'Authorization': `token ${PAT}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else if (res.statusCode === 404) {
          resolve(null); // Return null for 404s (like missing readme)
        } else {
          reject(new Error(`Failed to fetch ${url}: ${res.statusCode} ${data}`));
        }
      });
    }).on('error', reject);
  });
}

function calculateScore(repo) {
  let score = 0;
  
  // Base points for stars
  score += (repo.stargazers_count || 0) * 50;
  
  // Points for having a description
  if (repo.description && repo.description.length > 10) score += 10;
  
  // Points for recent updates (last 6 months)
  const updatedDate = new Date(repo.updated_at);
  const now = new Date();
  const monthsSinceUpdate = (now - updatedDate) / (1000 * 60 * 60 * 24 * 30);
  if (monthsSinceUpdate < 6) {
    score += Math.max(0, 30 - (monthsSinceUpdate * 5));
  }
  
  // Keyword bonus for Hiring Managers
  const searchableText = `${repo.name} ${repo.description || ''}`.toLowerCase();
  const keywords = ['ai', 'agent', 'sap', 'erp', 'mes', 'wms', 'integration', 'cloud', 'infrastructure', 'automation', 'docker', 'machine learning', 'llm'];
  for (const kw of keywords) {
    if (searchableText.includes(kw)) {
      score += 20;
    }
  }

  return score;
}

async function main() {
  try {
    console.log('Fetching repositories...');
    let page = 1;
    let allRepos = [];
    while (true) {
      const repos = await fetchGithub(`https://api.github.com/user/repos?per_page=100&page=${page}&affiliation=owner,collaborator`);
      if (!repos || repos.length === 0) break;
      allRepos = allRepos.concat(repos);
      page++;
    }
    
    console.log(`Found ${allRepos.length} repos. Fetching READMEs and calculating scores...`);
    
    const detailedRepos = [];
    for (const r of allRepos) {
      // Calculate base score
      let score = calculateScore(r);
      
      // Fetch Readme
      console.log(`Fetching README for ${r.name}...`);
      let readmeContent = null;
      const readmeRes = await fetchGithub(`https://api.github.com/repos/${r.owner.login}/${r.name}/readme`);
      
      if (readmeRes && readmeRes.content) {
        readmeContent = Buffer.from(readmeRes.content, 'base64').toString('utf8');
        score += 30; // Bonus for having a README
      }
      
      detailedRepos.push({
        id: r.id,
        name: r.name,
        description: r.description,
        html_url: r.html_url,
        stargazers_count: r.stargazers_count,
        language: r.language,
        private: r.private,
        topics: r.topics,
        updated_at: r.updated_at,
        score: score,
        readme: readmeContent
      });
    }

    // Sort by score descending
    detailedRepos.sort((a, b) => b.score - a.score);

    fs.writeFileSync('src/repos.json', JSON.stringify(detailedRepos, null, 2));
    console.log(`Saved ${detailedRepos.length} detailed repos to src/repos.json`);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
