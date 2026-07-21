import { useRef, useState } from 'react';
import { RiEmotionLine, RiImageAddLine, RiSendPlane2Fill, RiCloseLine } from 'react-icons/ri';
import Avatar from '../ui/Avatar';
import EmojiPicker from '../ui/EmojiPicker';
import toast from 'react-hot-toast';

export default function CommentComposer({ user, members = [], onSubmit, disabled }) {
  const [text, setText] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    const caret = e.target.selectionStart;
    const before = val.slice(0, caret);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(caret - match[0].length);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const pickMention = (member) => {
    const before = text.slice(0, mentionIndex);
    const after = text.slice(mentionIndex + mentionQuery.length + 1);
    setText(`${before}@${member.username} ${after}`);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const insertEmoji = (emoji) => {
    setText((t) => t + emoji);
    inputRef.current?.focus();
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return toast.error('File too large (max 50MB)');
    setMediaFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setMediaPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setMediaPreview('file');
    }
    e.target.value = '';
  };

  const clearMedia = () => { setMediaFile(null); setMediaPreview(null); };

  const submit = () => {
    if (!text.trim() && !mediaFile) return;
    onSubmit({ text: text.trim(), mediaFile, mediaPreview });
    setText('');
    clearMedia();
    setShowEmoji(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
      e.preventDefault();
      submit();
    }
  };

  const suggestions = members.filter(
    (m) =>
      m.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      m.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
      <Avatar user={user} size="sm" />
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Media preview */}
        {mediaPreview && (
          <div style={{ position: 'relative', marginBottom: 8, display: 'inline-block' }}>
            {mediaPreview !== 'file' ? (
              <img src={mediaPreview} alt="preview" style={{ maxHeight: 120, borderRadius: 8, display: 'block' }} />
            ) : (
              <div style={{ padding: '8px 12px', background: 'var(--color-bg-card)', borderRadius: 8, fontSize: '0.8rem' }}>
                📎 {mediaFile?.name}
              </div>
            )}
            <button
              type="button"
              onClick={clearMedia}
              style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <RiCloseLine size={14} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-bg-card)', borderRadius: 'var(--radius-full)', padding: '2px 6px 2px 14px' }}>
          <input
            ref={inputRef}
            className="comment-input"
            placeholder="Write a comment... (Enter to send)"
            style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px 0', fontSize: '0.85rem', outline: 'none', color: 'var(--color-text-primary)' }}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />

          <div style={{ position: 'relative' }}>
            <button type="button" className="icon-btn" onClick={() => setShowEmoji((s) => !s)} aria-label="Emoji" style={iconBtn}>
              <RiEmotionLine size={18} />
            </button>
            {showEmoji && <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />}
          </div>

          <button type="button" className="icon-btn" onClick={() => fileRef.current?.click()} aria-label="Add media" style={iconBtn}>
            <RiImageAddLine size={18} />
          </button>
          <input type="file" ref={fileRef} onChange={handleFile} style={{ display: 'none' }} accept="image/*,video/*,audio/*,application/pdf" />

          <button
            type="button"
            onClick={submit}
            disabled={disabled || (!text.trim() && !mediaFile)}
            aria-label="Send"
            style={{ ...iconBtn, color: 'var(--color-primary)', opacity: disabled || (!text.trim() && !mediaFile) ? 0.4 : 1 }}
          >
            <RiSendPlane2Fill size={18} />
          </button>
        </div>

        {/* Mention suggestions */}
        {showMentions && suggestions.length > 0 && (
          <div style={{ position: 'absolute', bottom: '100%', left: 0, width: '100%', maxHeight: 180, overflowY: 'auto', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 30, marginBottom: 8 }}>
            {suggestions.map((m) => (
              <div
                key={m._id}
                onMouseDown={(e) => { e.preventDefault(); pickMention(m); }}
                className="mention-suggestion-item"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer' }}
              >
                <Avatar user={m} size="xs" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{m.displayName}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>@{m.username}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const iconBtn = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-text-muted)',
  padding: 6,
  borderRadius: '50%',
};
