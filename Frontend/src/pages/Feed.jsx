import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useGroupStore from '../store/groupStore';
import { feedAPI, BACKEND_URL } from '../api';
import Avatar from '../components/ui/Avatar';
import Loader from '../components/ui/Loader';
import Lightbox from '../components/ui/Lightbox';
import CommentComposer from '../components/feed/CommentComposer';
import toast from 'react-hot-toast';
import { RiImageAddLine, RiSendPlane2Fill, RiHeart3Fill, RiHeart3Line, RiChat3Line, RiEmotionLine } from 'react-icons/ri';
import EmojiPicker from '../components/ui/EmojiPicker';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const resolveMedia = (url) => (url?.startsWith('http') ? url : `${BACKEND_URL}${url}`);

export default function Feed() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentGroup, feed, fetchFeed, addPost, updatePostLike, addComment, feedGroupId, members } = useGroupStore();
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [showPostEmoji, setShowPostEmoji] = useState(false);
  const textareaRef = useRef(null);

  const [isPosting, setIsPosting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [recentlyCommented, setRecentlyCommented] = useState({});
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const fileInputRef = useRef();

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, selectionStart);
    const lastWordMatch = textBeforeCursor.match(/@(\w*)$/);
    if (lastWordMatch) {
      setMentionQuery(lastWordMatch[1]);
      setMentionTriggerIndex(selectionStart - lastWordMatch[0].length);
      setShowMentionSuggestions(true);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const handleSuggestionClick = (member) => {
    const val = content;
    const beforeMention = val.slice(0, mentionTriggerIndex);
    const afterCursor = val.slice(mentionTriggerIndex + mentionQuery.length + 1);
    setContent(`${beforeMention}@${member.username} ${afterCursor}`);
    setShowMentionSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
      const newCursorPos = beforeMention.length + member.username.length + 2;
      setTimeout(() => textareaRef.current.setSelectionRange(newCursorPos, newCursorPos), 0);
    }
  };

  const filteredSuggestions = members.filter(
    (m) =>
      m.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      m.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const renderTaggedContent = (text) => {
    if (!text) return '';
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) =>
      part.startsWith('@') ? (
        <span key={index} style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  useEffect(() => {
    if (currentGroup) {
      const hasFeedForGroup = feedGroupId === currentGroup._id && feed.length > 0;
      if (!hasFeedForGroup) {
        setInitialLoading(true);
        fetchFeed(currentGroup._id, true).finally(() => setInitialLoading(false));
      } else {
        setInitialLoading(false);
        fetchFeed(currentGroup._id, true);
      }
      useGroupStore.getState().fetchMembers(currentGroup._id);
    }
  }, [currentGroup?._id, feedGroupId]);

  const locationSearch = typeof window !== 'undefined' ? window.location.search : '';
  useEffect(() => {
    const queryParams = new URLSearchParams(locationSearch);
    const targetPostId = queryParams.get('postId');
    if (targetPostId && feed.length > 0) {
      // Auto-expand comments for the deep-linked post
      setExpandedComments((prev) => ({ ...prev, [targetPostId]: true }));
      const timer = setTimeout(() => {
        const el = document.getElementById(`post-${targetPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlighted-post');
          setTimeout(() => el.classList.remove('highlighted-post'), 3000);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [locationSearch, feed]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) return toast.error('File too large (max 50MB)');
      setMediaFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setMediaPreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setMediaPreview('media_icon');
      }
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim() && !mediaFile) return;
    setIsPosting(true);
    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content);
      if (mediaFile) formData.append('media', mediaFile);
      const { data } = await feedAPI.create(currentGroup._id, formData);
      if (data.post) addPost(data.post);
      setContent('');
      setMediaFile(null);
      setMediaPreview(null);
      setShowPostEmoji(false);
      toast.success('Posted! 🔥');
    } catch (err) {
      toast.error('Failed to post');
    } finally {
      setIsPosting(false);
    }
  };

  const toggleLike = async (postId) => {
    const post = feed.find((p) => p._id === postId);
    if (!post) return;
    const isLiked = post.likes?.some((l) => l._id === user._id || l === user._id);
    updatePostLike(postId, !isLiked, null, user._id);
    try {
      await feedAPI.like(currentGroup._id, postId);
    } catch (err) {
      updatePostLike(postId, isLiked, null, user._id);
      toast.error('Failed to like');
    }
  };

  const handleCommentSubmit = async (postId, { text, mediaFile: file, mediaPreview: preview }) => {
    if (!text && !file) return;
    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    setRecentlyCommented((prev) => ({ ...prev, [postId]: true }));

    const optimisticComment = {
      _id: `temp_${Date.now()}`,
      user: { _id: user._id, displayName: user.displayName, avatar: user.avatar },
      text,
      mediaUrl: file && preview && preview !== 'file' ? preview : null,
      mediaType: file?.type?.startsWith('image/') ? 'image' : file ? 'file' : null,
      createdAt: new Date().toISOString(),
    };
    // Removed optimistic update to prevent duplication with socket events

    try {
      let payload = text;
      if (file) {
        payload = new FormData();
        payload.append('text', text);
        payload.append('media', file);
      }
      await feedAPI.comment(currentGroup._id, postId, payload);
    } catch (err) {
      toast.error('Failed to comment');
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const insertPostEmoji = (emoji) => {
    setContent((c) => c + emoji);
    textareaRef.current?.focus();
  };

  if (!currentGroup) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>👥</div>
        <h3>No group selected</h3>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 8 }}>Join or create a group to see the feed.</p>
      </div>
    );
  }

  const renderCommentMedia = (comment) => {
    if (!comment.mediaUrl) return null;
    const src = resolveMedia(comment.mediaUrl);
    if (comment.mediaType === 'image' || comment.mediaType === null) {
      return (
        <img
          src={src}
          alt="comment attachment"
          onClick={() => setLightboxSrc(src)}
          style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 8, marginTop: 6, cursor: 'zoom-in', display: 'block' }}
        />
      );
    }
    return (
      <a href={src} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>
        📎 View attachment
      </a>
    );
  };

  const renderComment = (comment, i) => (
    <div key={comment._id || i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
      <Avatar user={comment.user} size="sm" />
      <div style={{ flex: 1, background: 'var(--color-bg-card)', padding: '7px 12px', borderRadius: 'var(--radius-lg)' }}>
        <span style={{ fontWeight: 600, fontSize: '0.8rem', marginRight: 8 }}>{comment.user?.displayName}</span>
        {comment.text && <span style={{ fontSize: '0.85rem' }}>{renderTaggedContent(comment.text)}</span>}
        {renderCommentMedia(comment)}
      </div>
    </div>
  );

  return (
    <div className="page-container" style={{ maxWidth: 640 }}>
      {/* Create Post */}
      <div className="card mb-6" style={{ padding: '16px' }}>
        <form onSubmit={handlePost}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Avatar user={user} />
            <div style={{ flex: 1 }}>
              <div style={{ position: 'relative' }}>
                <textarea
                  ref={textareaRef}
                  className="input"
                  placeholder="What's on your mind? Share your progress! (Use @ to tag) 🔥"
                  value={content}
                  onChange={handleContentChange}
                  style={{ minHeight: 72, marginBottom: 10, border: 'none', background: 'transparent', padding: 0, fontSize: '0.95rem', resize: 'none', width: '100%' }}
                />

                {showMentionSuggestions && filteredSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight: 200, overflowY: 'auto', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 20, marginTop: 8 }}>
                    {filteredSuggestions.map((member) => (
                      <div
                        key={member._id}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(member); }}
                        className="mention-suggestion-item"
                      >
                        <Avatar user={member} size="xs" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{member.displayName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>@{member.username}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {mediaPreview && (
                <div style={{ position: 'relative', marginBottom: 12 }}>
                  {mediaPreview !== 'media_icon' ? (
                    <img src={mediaPreview} alt="Preview" style={{ maxHeight: 280, borderRadius: 'var(--radius-md)', width: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ background: 'var(--color-bg-elevated)', padding: 16, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.85rem' }}>
                      <span>📎</span> {mediaFile.name}
                    </div>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)' }} onClick={() => { setMediaFile(null); setMediaPreview(null); }}>
                    ✕
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 4, position: 'relative' }}>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*,video/*,audio/*,application/pdf" />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current.click()}>
                    <RiImageAddLine size={18} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>Media</span>
                  </button>
                  <div style={{ position: 'relative' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPostEmoji((s) => !s)}>
                      <RiEmotionLine size={18} style={{ color: 'var(--color-primary)' }} />
                    </button>
                    {showPostEmoji && <EmojiPicker onSelect={insertPostEmoji} onClose={() => setShowPostEmoji(false)} />}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-sm" disabled={isPosting || (!content.trim() && !mediaFile)}>
                  {isPosting ? 'Posting...' : <><RiSendPlane2Fill /> Post</>}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Feed List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {initialLoading ? (
          <Loader text="Gathering group updates..." />
        ) : (
          <>
            {feed.map((post) => {
              const isLiked = post.likes?.some((l) => (l._id || l) === user._id);
              const comments = post.comments || [];
              const isExpanded = expandedComments[post._id];
              const isRecentlyCommented = recentlyCommented[post._id];
              const visibleComments = isExpanded ? comments : (isRecentlyCommented && comments.length > 0 ? comments.slice(-1) : []);

              return (
                <div key={post._id} id={`post-${post._id}`} className="feed-post">
                  <div className="post-header" style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.author._id}`)}>
                    <Avatar user={post.author} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{post.author.displayName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{dayjs(post.createdAt).fromNow()}</div>
                    </div>
                    {post.isAchievement && (
                      <div className="badge badge-warning" style={{ marginLeft: 'auto', background: 'var(--gradient-fire)', color: 'white', border: 'none' }}>
                        {post.achievementData?.emoji} {post.achievementData?.title}
                      </div>
                    )}
                  </div>

                  {post.content && (
                    <div className="post-content" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                      {renderTaggedContent(post.content)}
                    </div>
                  )}

                  {post.mediaUrl && post.type === 'image' && (
                    <img
                      src={resolveMedia(post.mediaUrl)}
                      className="post-media"
                      alt="Post attachment"
                      onClick={() => setLightboxSrc(resolveMedia(post.mediaUrl))}
                      style={{ cursor: 'zoom-in' }}
                    />
                  )}

                  <div className="post-actions">
                    <button className={`post-action-btn ${isLiked ? 'liked' : ''}`} onClick={() => toggleLike(post._id)}>
                      {isLiked ? <RiHeart3Fill size={20} /> : <RiHeart3Line size={20} />}
                      <span>{post.likes?.length || 0}</span>
                    </button>
                    <button
                      className="post-action-btn"
                      onClick={() => setExpandedComments((prev) => ({ ...prev, [post._id]: !prev[post._id] }))}
                    >
                      <RiChat3Line size={20} />
                      <span>{comments.length}</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  <div style={{ padding: '10px 16px', background: 'var(--color-bg-elevated)' }}>
                    {/* Toggle to view all when collapsed and more than one comment */}
                    {!isExpanded && comments.length > (isRecentlyCommented ? 1 : 0) && (
                      <button
                        onClick={() => setExpandedComments((prev) => ({ ...prev, [post._id]: true }))}
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', marginBottom: 8, padding: 0 }}
                      >
                        {isRecentlyCommented ? `View previous ${comments.length - 1} comment${comments.length - 1 > 1 ? 's' : ''}` : (comments.length === 1 ? 'View 1 comment' : `View all ${comments.length} comments`)}
                      </button>
                    )}

                    {visibleComments.map((comment, i) => renderComment(comment, i))}

                    {isExpanded && comments.length > 0 && (
                      <button
                        onClick={() => setExpandedComments((prev) => ({ ...prev, [post._id]: false }))}
                        style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', marginBottom: 4, padding: 0 }}
                      >
                        Hide comments
                      </button>
                    )}

                    <CommentComposer
                      user={user}
                      members={members}
                      disabled={submittingComment[post._id]}
                      onSubmit={(payload) => handleCommentSubmit(post._id, payload)}
                    />
                  </div>
                </div>
              );
            })}
            {feed.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                No posts yet. Be the first to share your progress! 🔥
              </div>
            )}
          </>
        )}
      </div>

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
