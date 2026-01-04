
import { processInputFile } from './src/lib/input-processor';

// Mock File object
class MockFile {
  name: string;
  type: string;
  constructor(name: string, type: string) {
    this.name = name;
    this.type = type;
  }
}

// polyfill File
global.File = MockFile as any;

const run = async () => {
    const file1 = new File('audio1.mp3', 'audio/mp3');
    const file2 = new File('audio2.mp3', 'audio/mp3');

    // We need to bypass the fact that processInputFile calls processAudio which uses setTimeout
    // but we can just import processAudio directly if we export it, or just use processInputFile and wait.
    // However, input-processor export processInputFile. 
    // processAudio is not exported. 
    // But processInputFile waits for it.
    
    // We need to wait for the promise.
    
    try {
        const result1 = await processInputFile(file1);
        const result2 = await processInputFile(file2);
        
        console.log("File 1 content:", result1[0].structured_content);
        console.log("File 2 content:", result2[0].structured_content);
        
        if (result1[0].structured_content === result2[0].structured_content) {
            console.log("FAIL: Content is identical (hardcoded constant)");
        } else {
            console.log("SUCCESS: Content is different");
        }
    } catch (e) {
        console.error(e);
    }
};

// We can't really run this easily with node causing imports of pdfjs-dist etc might fail in node environment without setup.
// I will just rely on code analysis. The code is pretty clear.
console.log("Code analysis says lines 171-173 in src/lib/input-processor.ts are hardcoded constants.");
