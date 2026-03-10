'use client'

import { useState } from 'react'
import Image from 'next/image'

type Props = {
  src: string
  alt: string
}

export default function ImageModal({ src, alt }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative lg:w-96 lg:flex-shrink-0 w-full aspect-[4/3] rounded-xl overflow-hidden cursor-zoom-in block"
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 384px"
          priority
        />
      </button>

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
              src={src}
              alt={alt}
              fill
              className="object-contain"
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
        </div>
      )}
    </>
  )
}
