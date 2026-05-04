import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Briefcase, Heart, MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { communityApi } from '@/lib/api'
import { formatRelativeTime, SPECIALTY_META } from '@/lib/utils'
import type { CommunityPost, JobPosting } from '@/types'

type Tab = 'feed' | 'jobs'

export default function CommunityPage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('feed')
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    if (tab === 'feed') {
      communityApi.getFeed()
        .then(({ data }) => setPosts(data.posts))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      communityApi.getJobs()
        .then(({ data }) => setJobs(data.jobs))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [tab])

  async function handleApply(jobId: string) {
    try {
      await communityApi.applyForJob(jobId)
      setAppliedIds((p) => new Set([...p, jobId]))
      toast('Application sent!', 'success')
    } catch {
      toast('Could not apply. Try again.', 'error')
    }
  }

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-20 bg-onyx/95 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Users size={20} className="text-brand-green-light" />
          <h1 className="font-heading font-bold text-xl text-white">Community</h1>
        </div>
        <div className="flex rounded-xl bg-white/5 p-1 gap-1">
          {([
            { key: 'feed' as Tab, label: '📱 Feed' },
            { key: 'jobs' as Tab, label: '💼 Jobs & Placement' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-lg py-1.5 text-sm font-heading font-semibold transition-all ${tab === key ? 'bg-brand-gold text-brand-green' : 'text-silver hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {tab === 'feed' ? (
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="divide-y divide-white/5"
            >
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-3">
                    <div className="flex gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-48 w-full rounded-xl" />
                  </div>
                ))
              ) : posts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">📱</div>
                  <div className="font-heading font-bold text-white">No posts yet</div>
                  <div className="text-silver text-sm mt-1">Be the first to share your work!</div>
                </div>
              ) : (
                posts.map((post, i) => (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-4 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={post.author.user.avatar} name={post.author.user.name} size="md" />
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">{post.author.user.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-silver">
                          {post.author.specialties[0] && (
                            <span>{SPECIALTY_META[post.author.specialties[0]]?.emoji} {SPECIALTY_META[post.author.specialties[0]]?.label}</span>
                          )}
                          <span>· {formatRelativeTime(post.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {post.imageUrl && (
                      <div className="rounded-xl overflow-hidden bg-white/5">
                        <img src={post.imageUrl} alt="" className="w-full max-h-80 object-cover" loading="lazy" />
                      </div>
                    )}

                    {post.caption && (
                      <p className="text-sm text-white/80 leading-relaxed">{post.caption}</p>
                    )}

                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {post.tags.map((t) => (
                          <span key={t} className="text-xs text-brand-green-light">#{SPECIALTY_META[t]?.label.toLowerCase().replace(' ', '')}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-silver text-sm">
                      <button className="flex items-center gap-1.5 hover:text-red-400 transition-colors">
                        <Heart size={14} /> {post.likeCount}
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-brand-green-light transition-colors">
                        <MessageCircle size={14} /> {post.commentCount}
                      </button>
                    </div>
                  </motion.article>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="jobs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 space-y-4"
            >
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)
              ) : jobs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">💼</div>
                  <div className="font-heading font-bold text-white">No jobs posted yet</div>
                  <div className="text-silver text-sm mt-1">Check back soon!</div>
                </div>
              ) : (
                jobs.map((job, i) => (
                  <motion.article
                    key={job.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl border border-white/8 bg-white/4 p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar src={job.outlet.logoImage} name={job.outlet.name} size="md" />
                      <div className="flex-1">
                        <div className="font-heading font-bold text-white">{job.title}</div>
                        <div className="text-sm text-brand-green-light">{job.outlet.name}</div>
                        <div className="text-xs text-silver">{job.outlet.city}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${job.isFullTime ? 'bg-brand-green/20 text-brand-green-light' : 'bg-blue-500/15 text-blue-400'}`}>
                        {job.isFullTime ? 'Full-time' : 'Part-time'}
                      </span>
                    </div>

                    <p className="text-sm text-white/60 line-clamp-2">{job.description}</p>

                    <div className="flex flex-wrap gap-1.5">
                      {job.specialtiesNeeded.map((s) => (
                        <span key={s} className="text-xs bg-white/8 text-silver px-2 py-0.5 rounded-full">
                          {SPECIALTY_META[s]?.emoji} {SPECIALTY_META[s]?.label}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      {job.salaryMin && (
                        <span className="text-sm text-brand-gold font-mono">
                          KES {job.salaryMin.toLocaleString()}{job.salaryMax ? `–${job.salaryMax.toLocaleString()}` : '+'}/mo
                        </span>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <span className="text-xs text-silver">{job.applicantCount} applicants</span>
                        <Button
                          variant={appliedIds.has(job.id) ? 'secondary' : 'primary'}
                          size="sm"
                          disabled={appliedIds.has(job.id)}
                          onClick={() => handleApply(job.id)}
                        >
                          {appliedIds.has(job.id) ? '✓ Applied' : 'Apply'}
                        </Button>
                      </div>
                    </div>
                  </motion.article>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
