import { React } from 'react';
import { Box } from '@mui/material';
import DOMPurify from 'dompurify';

DOMPurify.addHook('afterSanitizeAttributes', function (node) {
  // set all elements owning target to target=_blank
  if ('target' in node) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener');
  }
});

export function HtmlBox({ html }) {
  return (
    <div>
      {html && (
        <Box
          sx={{ width: '90%' }}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(html),
          }}
        />
      )}
    </div>
  );
}
