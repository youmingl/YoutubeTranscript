import React, { useState } from 'react';
import './collapsible-transcript.css';

const CollapsibleTranscript: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="collapsible-container">
      <div className="collapsible-header" onClick={toggleExpand}>
        <span className="arrow">{isExpanded ? '▼' : '▶'}</span>
        <span className="title">{isExpanded ? 'Hide Transcript' : 'Show Transcript'}</span>
      </div>
      <div className={`collapsible-content ${isExpanded ? 'expanded' : ''}`}>
        <div className="transcript">
          {/* Add your transcript text here */}
          <p>Transcript content...</p>
        </div>
      </div>
    </div>
  );
};

export default CollapsibleTranscript;