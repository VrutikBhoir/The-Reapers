import type { UnifiedRecord } from './input-processor';

// Simple topic registry to ensure consistency within a session
// In a real system, this would be backed by a persistent database
const TOPIC_REGISTRY: Record<string, string> = {};

// Helper to generate a short, deterministic hash from a string
const generateShortHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Ensure positive hex string, padded to at least 4 chars
  return Math.abs(hash).toString(16).padStart(4, '0').substring(0, 4);
};

export const linkRecordsByTopic = (records: UnifiedRecord[]): UnifiedRecord[] => {
  // 1. Identify PDF Anchor
  // Find the first PDF record to serve as the Source of Truth for the topic
  const pdfAnchor = records.find(r => r.source_type === 'pdf');
  
  let anchorTopic: string | null = null;
  let anchorGroupId: string | null = null;

  if (pdfAnchor) {
      const contentToAnalyze = pdfAnchor.structured_content || pdfAnchor.raw_content || "";
      anchorTopic = extractCanonicalTopic(contentToAnalyze, 'pdf');
      
      const kebabTopic = anchorTopic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const topicHash = generateShortHash(anchorTopic);
      anchorGroupId = `topic-${kebabTopic}-${topicHash}`;
      
      // Register the anchor
      TOPIC_REGISTRY[anchorTopic] = anchorGroupId;
  }

  return records.map(record => {
    // 2. Assign Topic & Group ID
    // If a PDF anchor exists, ALL records inherit its topic and group_id
    // This strictly enforces "Part 3: GROUP ALL INPUTS UNDER PDF TOPIC"
    
    let topic: string;
    let groupId: string;

    if (anchorTopic && anchorGroupId) {
        topic = anchorTopic;
        groupId = anchorGroupId;
        
        // Special Handling for API/Chat Content Types (Part 4)
        // They inherit the topic but need specific content types if not already set correctly
        if (record.source_type === 'api' || record.source_type === 'chat') {
            // We keep the record as is, but ensure topic is consistent
            // The content_type is usually set during input processing, 
            // but we can refine it here if needed. 
            // For now, we trust the input processor for content_type (e.g. 'question', 'log')
        }

    } else {
        // Fallback: If no PDF is present, behave as before (or should we fail? 
        // User says "Always process PDF files FIRST", implying a PDF will exist.
        // But for robustness, we'll self-derive if no PDF found, 
        // though this violates "PART 3" if we consider a mixed batch without PDF.
        // Assuming mixed batch *with* PDF based on "PDF is the SINGLE SOURCE OF TRUTH"
        
        const contentToAnalyze = record.structured_content || record.raw_content || "";
        topic = extractCanonicalTopic(contentToAnalyze, record.source_type);
        
        const kebabTopic = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const topicHash = generateShortHash(topic);
        groupId = `topic-${kebabTopic}-${topicHash}`;
    }

    return {
      ...record,
      topic: topic,
      group_id: groupId
    };
  });
};

const extractCanonicalTopic = (content: string, sourceType: string): string => {
  const text = content.toLowerCase();

  // --- PHYSICS ---
  // Specific Laws
  if (
    (text.includes('newton') && (text.includes('first') || text.includes('1st') || text.includes('inertia'))) ||
    (text.includes('law of motion') && text.includes('first'))
  ) {
    return "Newton's First Law of Motion";
  }
  if (
    (text.includes('newton') && (text.includes('second') || text.includes('2nd') || text.includes('f=ma') || text.includes('f = ma'))) ||
    (text.includes('law of motion') && text.includes('second'))
  ) {
    return "Newton's Second Law of Motion";
  }
  if (
    (text.includes('newton') && (text.includes('third') || text.includes('3rd') || text.includes('reaction'))) ||
    (text.includes('law of motion') && text.includes('third'))
  ) {
    return "Newton's Third Law of Motion";
  }
  // General Physics (if not matched above)
  if (text.includes('physics') || text.includes('force') || text.includes('velocity') || text.includes('acceleration') || text.includes('gravity')) {
     // Ensure we don't misclassify software "force" or "velocity" if context is clearly code
     if (!isSoftwareContext(text)) {
         return 'Classical Mechanics';
     }
  }

  // --- BIOLOGY ---
  if (text.includes('photosynthe') || text.includes('photo synthesis') || (text.includes('plant') && text.includes('light') && text.includes('energy'))) {
    return 'Photosynthesis';
  }
  if (text.includes('mitosis') || text.includes('cell division')) {
    return 'Cell Division (Mitosis)';
  }

  // --- COMPUTER SCIENCE / SOFTWARE ---
  if (text.includes('database') || text.includes('sql') || text.includes('mongo') || text.includes('postgres') || text.includes('dbms')) {
    return 'Database Systems';
  }
  if (text.includes('api') || text.includes('restful') || text.includes('endpoint') || (text.includes('json') && text.includes('request'))) {
    return 'API Development';
  }
  if (text.includes('react') || text.includes('jsx') || text.includes('hook') || text.includes('component')) {
    return 'React Development';
  }
  
  // --- FALLBACK ---
  // If no specific topic found, use a clean generic topic based on source type,
  // but avoid "General Text" if possible.
  // For logs, it's usually "System Logs"
  if (sourceType === 'log' || sourceType === 'api') return 'System Logs';
  if (sourceType === 'chat') return 'Chat History';

  return 'General Unclassified';
};

// Helper to distinguish software terms from physics terms
const isSoftwareContext = (text: string): boolean => {
    return text.includes('code') || text.includes('software') || text.includes('programming') || text.includes('function') || text.includes('variable');
};
