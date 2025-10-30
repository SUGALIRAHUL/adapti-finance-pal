import DOMPurify from 'dompurify';

type FormattedMessageProps = {
  content: string;
};

export function FormattedMessage({ content }: FormattedMessageProps) {
  // Sanitize content to prevent XSS attacks
  const sanitizedContent = DOMPurify.sanitize(content, { 
    ALLOWED_TAGS: [], // Strip all HTML tags, keep only text
    KEEP_CONTENT: true // Keep the text content
  });
  
  // Split content into lines
  const lines = sanitizedContent.split('\n');
  
  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        // Check if line is a heading (starts with ##, ###, or is all caps with colon)
        const isMainHeading = line.trim().startsWith('## ');
        const isSubHeading = line.trim().startsWith('### ');
        const isBoldText = line.trim().match(/^\*\*.*\*\*:?$/);
        const isNumberedList = line.trim().match(/^\d+\./);
        const isBulletList = line.trim().startsWith('- ') || line.trim().startsWith('* ');
        
        // Remove markdown symbols
        let cleanedLine = line
          .replace(/^##\s+/, '')
          .replace(/^###\s+/, '')
          .replace(/^\*\*/, '')
          .replace(/\*\*$/, '')
          .replace(/\*\*:/, ':');

        if (line.trim() === '') {
          return <div key={index} className="h-2" />;
        }

        if (isMainHeading) {
          return (
            <h2 key={index} className="text-lg font-bold text-foreground mt-4 mb-2">
              {cleanedLine}
            </h2>
          );
        }

        if (isSubHeading) {
          return (
            <h3 key={index} className="text-base font-bold text-foreground mt-3 mb-1">
              {cleanedLine}
            </h3>
          );
        }

        if (isBoldText) {
          return (
            <p key={index} className="font-bold text-foreground">
              {cleanedLine}
            </p>
          );
        }

        if (isNumberedList || isBulletList) {
          return (
            <p key={index} className="ml-4 text-foreground/90">
              {line.trim()}
            </p>
          );
        }

        // Regular paragraph - preserve inline bold
        const formattedLine = cleanedLine.split(/(\*\*.*?\*\*)/).map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={i} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        return (
          <p key={index} className="text-foreground/90 leading-relaxed">
            {formattedLine}
          </p>
        );
      })}
    </div>
  );
}
