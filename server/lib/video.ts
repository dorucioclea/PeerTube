import { Transaction } from 'sequelize/types'
import { TagModel } from '@server/models/video/tag'
import { VideoModel } from '@server/models/video/video'
import { FilteredModelAttributes } from '@server/types'
import { MTag, MThumbnail, MVideoTag, MVideoThumbnail } from '@server/types/models'
import { ThumbnailType, VideoCreate, VideoPrivacy } from '@shared/models'
import { createVideoMiniatureFromExisting } from './thumbnail'

function buildLocalVideoFromReq (videoInfo: VideoCreate, channelId: number): FilteredModelAttributes<VideoModel> {
  return {
    name: videoInfo.name,
    remote: false,
    category: videoInfo.category,
    licence: videoInfo.licence,
    language: videoInfo.language,
    commentsEnabled: videoInfo.commentsEnabled !== false, // If the value is not "false", the default is "true"
    downloadEnabled: videoInfo.downloadEnabled !== false,
    waitTranscoding: videoInfo.waitTranscoding || false,
    nsfw: videoInfo.nsfw || false,
    description: videoInfo.description,
    support: videoInfo.support,
    privacy: videoInfo.privacy || VideoPrivacy.PRIVATE,
    channelId: channelId,
    originallyPublishedAt: videoInfo.originallyPublishedAt
  }
}

async function buildVideoThumbnailsFromReq (options: {
  video: MVideoThumbnail
  files: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[]
  fallback: (type: ThumbnailType) => Promise<MThumbnail>
  automaticallyGenerated?: boolean
}) {
  const { video, files, fallback, automaticallyGenerated } = options

  const promises = [
    {
      type: ThumbnailType.MINIATURE,
      fieldName: 'thumbnailfile'
    },
    {
      type: ThumbnailType.PREVIEW,
      fieldName: 'previewfile'
    }
  ].map(p => {
    const fields = files?.[p.fieldName]

    if (fields) {
      return createVideoMiniatureFromExisting({
        inputPath: fields[0].path,
        video,
        type: p.type,
        automaticallyGenerated: automaticallyGenerated || false
      })
    }

    return fallback(p.type)
  })

  return Promise.all(promises)
}

async function setVideoTags (options: {
  video: MVideoTag
  tags: string[]
  transaction?: Transaction
  defaultValue?: MTag[]
}) {
  const { video, tags, transaction, defaultValue } = options
  // Set tags to the video
  if (tags) {
    const tagInstances = await TagModel.findOrCreateTags(tags, transaction)

    await video.$set('Tags', tagInstances, { transaction })
    video.Tags = tagInstances
  } else {
    video.Tags = defaultValue || []
  }
}

// ---------------------------------------------------------------------------

export {
  buildLocalVideoFromReq,
  buildVideoThumbnailsFromReq,
  setVideoTags
}
