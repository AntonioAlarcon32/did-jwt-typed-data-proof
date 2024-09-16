import React, { useState, useEffect } from 'react';

interface JsonFormatterProps {
  jsonString: string;
}

const JsonFormatter: React.FC<JsonFormatterProps> = ({ jsonString }) => {
  const [formattedJson, setFormattedJson] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const parsedJson = JSON.parse(jsonString);
      setFormattedJson(JSON.stringify(parsedJson, null, 2));
      setError(null);
    } catch (err) {
      setError('Invalid JSON string');
      setFormattedJson('');
    }
  }, [jsonString]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-w-full">
      <code className="text-sm">{formattedJson}</code>
    </pre>
  );
};

export default JsonFormatter;