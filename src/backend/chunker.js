function hasCommunitySignal(text) {
  const signalKeywords = [
    'residents',
    'community',
    'neighbourhood',
    'neighborhood',
    'public concerns',
    'complaints',
    'feedback',
    'issues',
    'residents',
    'citizens',
    'public input',
    'stakeholder',
    'engagement'
  ];

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const signalSentences = sentences.filter(sentence =>
    signalKeywords.some(keyword =>
      sentence.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  return signalSentences.length >= 2;
}

function isProceduralBoilerplate(text) {
  const boilerplatePatterns = [
    /attendance.*roll/i,
    /present.*vote/i,
    /motion.*carried/i,
    /seconded.*motion/i,
    /unanimously.*approved/i,
    /roll.*call/i,
    /voting.*record/i,
    /ayes.*nays/i,
    /call.*question/i,
    /vote.*result/i,
    /carried.*unanimously/i,
    /resolved.*that/i
  ];

  const boilerplateMatches = boilerplatePatterns.filter(pattern =>
    pattern.test(text)
  );

  // If more than 30% of the text matches boilerplate patterns, consider it procedural
  const textLength = text.length;
  const boilerplateLength = boilerplateMatches.length * 50; // Rough estimate
  return boilerplateLength / textLength > 0.3;
}

function isLegalFinancialCeremonial(text) {
  const excludePatterns = [
    /bylaw.*amendment/i,
    /municipal.*code/i,
    /zoning.*bylaw/i,
    /financial.*statement/i,
    /budget.*allocation/i,
    /tax.*levy/i,
    /ceremonial.*opening/i,
    /opening.*prayers/i,
    /national.*anthem/i,
    /oath.*office/i,
    /swearing.*ceremony/i,
    /legal.*opinion/i,
    /contract.*award/i,
    /tender.*process/i
  ];

  return excludePatterns.some(pattern => pattern.test(text));
}

function filterHighSignalParagraphs(text) {
  const signalKeywords = [
    'lack.*service',
    'absence.*service',
    'public.*complaint',
    'resident.*feedback',
    'infrastructure.*problem',
    'transit.*issue',
    'housing.*concern',
    'healthcare.*problem',
    'safety.*issue',
    'utility.*problem',
    'community.*engagement',
    'stakeholder.*input',
    'public.*consultation',
    'community.*meeting',
    'resident.*meeting',
    'neighbourhood.*concern',
    'neighborhood.*concern'
  ];

  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 50);
  const highSignalParagraphs = paragraphs.filter(paragraph => {
    return signalKeywords.some(keyword => {
      const regex = new RegExp(keyword, 'i');
      return regex.test(paragraph);
    });
  });

  return highSignalParagraphs.join('\n\n');
}

function removeLowSignalContent(text) {
  // Remove procedural boilerplate
  text = text.replace(/speaker.*roll.*call/gi, '');
  text = text.replace(/motion.*seconded.*carried/gi, '');
  text = text.replace(/resolved.*unanimously/gi, '');
  text = text.replace(/ayes.*nays.*motion/gi, '');
  text = text.replace(/vote.*recorded.*follows/gi, '');

  // Remove repeated disclaimers and legal notices
  text = text.replace(/disclaimer.*liability/gi, '');
  text = text.replace(/terms.*conditions/gi, '');
  text = text.replace(/privacy.*policy/gi, '');
  text = text.replace(/copyright.*notice/gi, '');

  // Remove meeting formalities
  text = text.replace(/meeting.*called.*order/gi, '');
  text = text.replace(/adjournment.*meeting/gi, '');

  return text.replace(/\s+/g, ' ').trim();
}

function splitIntoChunks(text, maxChars = 2400) { // ~800 tokens
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    const testChunk = currentChunk ? `${currentChunk} ${trimmedSentence}.` : `${trimmedSentence}.`;

    if (testChunk.length <= maxChars) {
      currentChunk = testChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = `${trimmedSentence}.`;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 100); // Minimum chunk size
}

function calculateKeywordDensity(text) {
  const signalKeywords = [
    'residents', 'community', 'neighbourhood', 'neighborhood', 'public concerns',
    'complaints', 'feedback', 'issues', 'residents', 'citizens', 'public input',
    'stakeholder', 'engagement', 'lack', 'absence', 'problem', 'concern', 'issue'
  ];

  const words = text.toLowerCase().split(/\s+/);
  const keywordCount = words.filter(word =>
    signalKeywords.some(keyword => word.includes(keyword))
  ).length;

  return keywordCount / words.length;
}

export function chunkDocuments(city, extractedDocuments) {
  const { name: municipality } = city;
  const allChunks = [];

  for (const doc of extractedDocuments) {
    const { source_url, title, raw_text } = doc;

    // Step 1: Filter out low-signal documents entirely
    if (!hasCommunitySignal(raw_text)) {
      console.log(`Filtering out document "${title}": insufficient community signal`);
      continue;
    }

    if (isProceduralBoilerplate(raw_text)) {
      console.log(`Filtering out document "${title}": procedural boilerplate`);
      continue;
    }

    if (isLegalFinancialCeremonial(raw_text)) {
      console.log(`Filtering out document "${title}": legal/financial/ceremonial content`);
      continue;
    }

    // Step 2: Preserve high-signal paragraphs
    let filteredText = filterHighSignalParagraphs(raw_text);

    // If no high-signal paragraphs, try removing low-signal content from whole document
    if (!filteredText || filteredText.length < 300) {
      filteredText = removeLowSignalContent(raw_text);
    }

    // Final check for minimum content
    if (filteredText.length < 300) {
      console.log(`Filtering out document "${title}": insufficient content after filtering`);
      continue;
    }

    // Step 3: Split into chunks
    const chunks = splitIntoChunks(filteredText);

    for (let i = 0; i < chunks.length; i++) {
      allChunks.push({
        municipality,
        source_url,
        title,
        chunk_index: i + 1,
        total_chunks: chunks.length,
        text: chunks[i]
      });
    }
  }

  // Step 4: Limit to maximum 30 chunks per city
  if (allChunks.length > 30) {
    // Sort by keyword density (highest first)
    allChunks.sort((a, b) => calculateKeywordDensity(b.text) - calculateKeywordDensity(a.text));
    // Keep top 30
    allChunks.splice(30);
    console.log(`Limited to top 30 chunks by keyword density`);
  }

  return allChunks;
}
