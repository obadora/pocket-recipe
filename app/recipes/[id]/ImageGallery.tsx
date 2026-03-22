'use client'

import { useState } from 'react'
import Image from 'next/image'

type ImageItem = {
  url: string
  isMain: boolean
  order: number
}

type Props = {
  images: ImageItem[]
  alt: string
}

export default function ImageGallery({ images, alt }: Props) {
  const mainIndex = images.findIndex((img) => img.isMain)
  const [activeIndex, setActiveIndex] = useState(mainIndex >= 0 ? mainIndex : 0)
  const [open, setOpen] = useState(false)

  if (images.length === 0) return null

  const activeImage = images[activeIndex]

  return (
    <>
      <div className="lg:w-96 lg:flex-shrink-0 space-y-2">
        {/* メイン画像 */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-zoom-in block"
        >
          <Image
            src={activeImage.url}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 384px"
            priority
          />
        </button>

        {/* サムネイル列 */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, index) => (
              <button
                key={img.url}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${index === activeIndex ? 'border-zinc-900' : 'border-transparent'}`}
              >
                <Image
                  src={img.url}
                  alt={`${alt} ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4 gap-3"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="self-end text-white text-sm hover:text-zinc-300 transition-colors cursor-pointer"
          >
            閉じる ✕
          </button>
          <div className="relative w-full max-w-4xl flex-1 min-h-0" onClick={(e) => e.stopPropagation()}>
            <Image
              src={activeImage.url}
              alt={alt}
              fill
              className="object-contain"
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {images.map((img, index) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${index === activeIndex ? 'border-white' : 'border-white/30'}`}
                >
                  <Image
                    src={img.url}
                    alt={`${alt} ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
