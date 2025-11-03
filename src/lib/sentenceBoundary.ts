/**
 * Collects chunks of text and splits them into sentences
 */
export class SentenceBoundaryCollector {
  private buffer: string = '';
  
  /**
   * Add new text chunk and return any complete sentences found
   */
  addChunk(chunk: string): string[] {
    this.buffer += chunk;
    const sentences: string[] = [];
    
    // Match sentence boundaries: . ? ! or newline
    const sentenceRegex = /[.?!\\n]+/g;
    let lastIndex = 0;
    let match;
    
    while ((match = sentenceRegex.exec(this.buffer)) !== null) {
      const endIndex = match.index + match[0].length;
      const sentence = this.buffer.slice(lastIndex, endIndex).trim();
      
      if (sentence) {
        sentences.push(sentence);
      }
      lastIndex = endIndex;
    }
    
    // Keep remaining text in buffer
    this.buffer = this.buffer.slice(lastIndex);
    
    return sentences;
  }
  
  /**
   * Get any remaining text in the buffer
   */
  flush(): string {
    const remaining = this.buffer.trim();
    this.buffer = '';
    return remaining;
  }
  
  /**
   * Clear the buffer
   */
  reset(): void {
    this.buffer = '';
  }
}
