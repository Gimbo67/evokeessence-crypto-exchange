import fs from 'fs';
import yaml from 'js-yaml';

try {
  const content = fs.readFileSync('openapi-schema.yaml', 'utf8');
  yaml.load(content);
  console.log('YAML file is valid');
  
  // Check if there's a duplicate 'paths:' section
  const count = (content.match(/^paths:/gm) || []).length;
  if (count > 1) {
    console.warn(`Warning: There are ${count} 'paths:' sections in the file, which might cause issues`);
  }
} catch (error) {
  console.error('Error validating YAML:', error.message);
  
  // Try to locate the line with the error
  if (error.mark && error.mark.line) {
    const lines = content.split('\n');
    const errorLine = error.mark.line;
    
    console.log('\nContext around error:');
    for (let i = Math.max(0, errorLine - 5); i < Math.min(lines.length, errorLine + 5); i++) {
      if (i === errorLine) {
        console.log(`>> ${i + 1}: ${lines[i]}`);
      } else {
        console.log(`   ${i + 1}: ${lines[i]}`);
      }
    }
  }
}