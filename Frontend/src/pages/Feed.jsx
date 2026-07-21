import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useGroupStore from '../store/groupStore';
import { feedAPI, BACKEND_URL } from '../api';
import Avatar from '../components/ui/Avatar';
import Loader from '../components/ui/Loader';
import toast from 'react-hot-toast';
import { RiImageAddLine, RiSendPlane2Fill, RiHeart3Fill, RiHeart3Line, RiChat3Line } from 'react-icons/ri';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

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
  const textareaRef = useRef(null);

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, selectionStart);
    const lastWordMatch = textBeforeCursor.match(/@(\w*)$/);
    if (lastWordMatch) {
      const query = lastWordMatch[1];
      setMentionQuery(query);
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
    const newContent = `${beforeMention}@${member.username} ${afterCursor}`;
    setContent(newContent);
    setShowMentionSuggestions(false);
    
    if (textareaRef.current) {
      textareaRef.current.focus();
      const newCursorPos = beforeMention.length + member.username.length + 2;
      setTimeout(() => {
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const filteredSuggestions = members.filter(m => 
    m.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    m.displayName.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const renderTaggedContent = (text) => {
    if (!text) return '';
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span 
            key={index} 
            style={{ 
              color: 'var(--color-primary-light)', 
              fontWeight: 600, 
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };
  const [isPosting, setIsPosting] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  // Track which posts are awaiting comment submission
  const [commentInputs, setCommentInputs] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});
  const fileInputRef = useRef();

  useEffect(() => {
    if (currentGroup) {
      const hasFeedForGroup = feedGroupId === currentGroup._id && feed.length > 0;
      if (!hasFeedForGroup) {
        setInitialLoading(true);
        fetchFeed(currentGroup._id, true).finally(() => setInitialLoading(false));
      } else {
        setInitialLoading(false);
        // Silent background update
        fetchFeed(currentGroup._id, true);
      }
      // Load members for tagging suggestions
      useGroupStore.getState().fetchMembers(currentGroup._id);
    }
  }, [currentGroup?._id, feedGroupId]);

  const locationSearch = typeof window !== 'undefined' ? window.location.search : '';
  useEffect(() => {
    const queryParams = new URLSearchParams(locationSearch);
    const targetPostId = queryParams.get('postId');
    if (targetPostId && feed.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`post-${targetPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlighted-post');
          setTimeout(() => {
            el.classList.remove('highlighted-post');
          }, 3000);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [locationSearch, feed]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        return toast.error('File too large (max 50MB)');
      }
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

      // Optimistic: add post immediately (socket will also fire, deduplication handled by _id)
      if (data.post) {
        addPost(data.post);
      }

      setContent('');
      setMediaFile(null);
      setMediaPreview(null);
      toast.success('Posted! 🔥');
    } catch (err) {
      toast.error('Failed to post');
    } finally {
      setIsPosting(false);
    }
  };

  // Optimistic like toggle
  const toggleLike = async (postId) => {
    const post = feed.find(p => p._id === postId);
    if (!post) return;

    const isLiked = post.likes?.some(l => l._id === user._id || l === user._id);

    // Optimistic update immediately
    updatePostLike(postId, !isLiked, null, user._id);

    try {
      await feedAPI.like(currentGroup._id, postId);
      // Socket will fire 'post-liked' which also calls updatePostLike — groupStore handles idempotency
    } catch (err) {
      // Revert on failure
      updatePostLike(postId, isLiked, null, user._id);
      toast.error('Failed to like');
    }
  };

  // Optimistic comment submit
  const handleCommentSubmit = async (postId) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;

    // Clear input immediately
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setSubmittingComment(prev => ({ ...prev, [postId]: true }));

    // Optimistic: add comment to UI right away
    const optimisticComment = {
      _id: `temp_${Date.now()}`,
      user: { _id: user._id, displayName: user.displayName, avatar: user.avatar },
      text,
      createdAt: new Date().toISOString(),
    };
    addComment(postId, optimisticComment);

    try {
      await feedAPI.comment(currentGroup._id, postId, text);
      // Socket 'new-comment' will fire — groupStore addComment is called again with the real comment
      // The temp one stays until next feed refresh, which is fine
    } catch (err) {
      toast.error('Failed to comment');
    } finally {
      setSubmittingComment(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleCommentKeyDown = (e, postId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommentSubmit(postId);
    }
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

  return (
    <div className="page-container" style={{ maxWidth: 680 }}>
      {/* Create Post */}
      <div className="card mb-6" style={{ padding: '20px' }}>
        <form onSubmit={handlePost}>
          <div style={{ display: 'flex', gap: 16 }}>
            <Avatar user={user} />
            <div style={{ flex: 1 }}>
              <div style={{ position: 'relative' }}>
                <textarea
                  ref={textareaRef}
                  className="input"
                  placeholder="What's on your mind? Share your progress! (Use @ to tag group members) 🔥"
                  value={content}
                  onChange={handleContentChange}
                  style={{ minHeight: 100, marginBottom: 12, border: 'none', background: 'transparent', padding: 0, fontSize: '1.1rem', resize: 'none', width: '100%' }}
                />

                {showMentionSuggestions && filteredSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    maxHeight: 200,
                    overflowY: 'auto',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 20,
                    marginTop: 8
                  }}>
                    {filteredSuggestions.map((member) => (
                      <div 
                        key={member._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSuggestionClick(member);
                        }}
                        className="mention-suggestion-item"
                      >
                        <Avatar user={member} size="xs" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{member.displayName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>@{member.username}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {mediaPreview && (
                <div style={{ position: 'relative', marginBottom: 16 }}>
                  {mediaPreview !== 'media_icon' ? (
                    <img src={mediaPreview} alt="Preview" style={{ maxHeight: 300, borderRadius: 'var(--radius-md)', width: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ background: 'var(--color-bg-elevated)', padding: 20, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span>📎</span> {mediaFile.name}
                    </div>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)' }} onClick={() => { setMediaFile(null); setMediaPreview(null); }}>
                    ✕
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept="image/*,video/*,audio/*,application/pdf" />
                <button type="button" className="btn btn-ghost" onClick={() => fileInputRef.current.click()}>
                  <RiImageAddLine size={20} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ color: 'var(--color-text-secondary)' }}>Media</span>
                </button>

                <button type="submit" className="btn btn-primary" disabled={isPosting || (!content.trim() && !mediaFile)}>
                  {isPosting ? 'Posting...' : <><RiSendPlane2Fill /> Post</>}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Feed List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {initialLoading ? (
          <Loader text="Gathering group updates..." />
        ) : (
          <>
            {feed.map(post => {
              const isLiked = post.likes?.some(l => (l._id || l) === user._id);
              const commentText = commentInputs[post._id] || '';

              return (
                <div key={post._id} id={`post-${post._id}`} className="feed-post">
                  <div className="post-header" style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.author._id}`)}>
                    <Avatar user={post.author} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{post.author.displayName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {dayjs(post.createdAt).fromNow()}
                      </div>
                    </div>
                    {post.isAchievement && (
                      <div className="badge badge-warning" style={{ marginLeft: 'auto', background: 'var(--gradient-fire)', color: 'white', border: 'none' }}>
                        {post.achievementData?.emoji} {post.achievementData?.title}
                      </div>
                    )}
                  </div>

                  {post.content && (
                    <div className="post-content" style={{ fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                      {renderTaggedContent(post.content)}
                    </div>
                  )}

                  {post.mediaUrl && post.type === 'image' && (
                    <img 
                      src={post.mediaUrl.startsWith('http') ? post.mediaUrl : `${BACKEND_URL}${post.mediaUrl}`} 
                      className="post-media" 
                      alt="Post attachment" 
                    />
                  )}

                  <div className="post-actions">
                    <button
                      className={`post-action-btn ${isLiked ? 'liked' : ''}`}
                      onClick={() => toggleLike(post._id)}
                    >
                      {isLiked ? <RiHeart3Fill size={22} /> : <RiHeart3Line size={22} />}
                      <span>{post.likes?.length || 0}</span>
                    </button>
                    <div className="post-action-btn" style={{ cursor: 'default' }}>
                      <RiChat3Line size={22} />
                      <span>{post.comments?.length || 0}</span>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div style={{ padding: '12px 20px', background: 'var(--color-bg-elevated)' }}>
                    {post.comments?.map((comment, i) => (
                      <div key={comment._id || i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <Avatar user={comment.user} size="sm" />
                        <div style={{ flex: 1, background: 'var(--color-bg-card)', padding: '8px 12px', borderRadius: 'var(--radius-lg)' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', marginRight: 8 }}>{comment.user?.displayName}</span>
                          <span style={{ fontSize: '0.9rem' }}>{renderTaggedContent(comment.text)}</span>
                        </div>
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                      <Avatar user={user} size="sm" />
                      <input
                        className="input"
                        placeholder="Write a comment... (Enter to send)"
                        style={{ flex: 1, padding: '8px 16px', borderRadius: 'var(--radius-full)' }}
                        value={commentText}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [post._id]: e.target.value }))}
                        onKeyDown={e => handleCommentKeyDown(e, post._id)}
                        disabled={submittingComment[post._id]}
                      />
                    </div>
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
    </div>
  );
}
