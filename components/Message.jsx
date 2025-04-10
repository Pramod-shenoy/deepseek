import { assets } from '@/assets/assets'
import Image from 'next/image'
import React, { useEffect } from 'react'
import Markdown from 'react-markdown'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-typescript'
import toast from 'react-hot-toast'

const Message = ({role, content}) => {

    useEffect(()=>{
        Prism.highlightAll()
    }, [content])

    const copyMessage = () => {
        navigator.clipboard.writeText(content)
        toast.success('Message copied to clipboard')
    }

    // Safety check to ensure content is a string
    const safeContent = typeof content === 'string' ? content : 
        content ? JSON.stringify(content) : 'No content available';

    return (
        <div className='flex flex-col items-center w-full max-w-3xl text-sm'>
            <div className={`flex flex-col w-full mb-8 ${role === 'user' && 'items-end'}`}>
                <div className={`group relative flex max-w-2xl py-3 rounded-xl ${role === 'user' ? 'bg-[#414158] px-5' : 'gap-3'}`}>
                    <div className={`opacity-0 group-hover:opacity-100 absolute ${role === 'user' ? '-left-16 top-2.5' : 'left-9 -bottom-6'} transition-all`}>
                        <div className='flex items-center gap-2 opacity-70'>
                            {
                                role === 'user' ? (
                                    <>
                                    <Image onClick={copyMessage} src={assets.copy_icon} alt='' className='w-4 cursor-pointer'/>
                                    <Image src={assets.pencil_icon} alt='' className='w-4.5 cursor-pointer'/>
                                    </>
                                ):(
                                    <>
                                    <Image onClick={copyMessage} src={assets.copy_icon} alt='' className='w-4.5 cursor-pointer'/>
                                    <Image src={assets.regenerate_icon} alt='' className='w-4 cursor-pointer'/>
                                    <Image src={assets.like_icon} alt='' className='w-4 cursor-pointer'/>
                                    <Image src={assets.dislike_icon} alt='' className='w-4 cursor-pointer'/>
                                    </>
                                )
                            }
                        </div>
                    </div>
                    {
                        role === 'user' ? 
                        (
                            <span className='text-white/90'>{safeContent}</span>
                        )
                        :
                        (
                            <>
                            <Image src={assets.logo_icon} alt='' className='h-9 w-9 p-1 border border-white/15 rounded-full'/>
                            <div className='space-y-4 w-full overflow-auto px-2'>
                                {content ? (
                                    <Markdown
                                        components={{
                                            // Render code blocks with proper syntax highlighting
                                            code(props) {
                                                const {children, className, ...rest} = props;
                                                const match = /language-(\w+)/.exec(className || '');
                                                return match ? (
                                                    <pre className={`rounded-md p-4 bg-gray-800 overflow-x-auto`}>
                                                        <code className={className} {...rest}>
                                                            {children}
                                                        </code>
                                                    </pre>
                                                ) : (
                                                    <code className="bg-gray-800 px-1 py-0.5 rounded text-sm" {...rest}>
                                                        {children}
                                                    </code>
                                                );
                                            },
                                            // Format lists
                                            ul({children}) {
                                                return <ul className="list-disc pl-6 mb-4">{children}</ul>
                                            },
                                            ol({children}) {
                                                return <ol className="list-decimal pl-6 mb-4">{children}</ol>
                                            },
                                            // Format headings
                                            h1({children}) {
                                                return <h1 className="text-xl font-bold mb-2">{children}</h1>
                                            },
                                            h2({children}) {
                                                return <h2 className="text-lg font-bold mb-2">{children}</h2>
                                            },
                                            h3({children}) {
                                                return <h3 className="text-md font-bold mb-2">{children}</h3>
                                            },
                                            // Format paragraphs and links
                                            p({children}) {
                                                return <p className="mb-3">{children}</p>
                                            },
                                            a({children, href}) {
                                                return <a className="text-blue-400 hover:underline" href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                                            },
                                            // Format emphasis and strong text
                                            em({children}) {
                                                return <em className="italic">{children}</em>
                                            },
                                            strong({children}) {
                                                return <strong className="font-bold">{children}</strong>
                                            }
                                        }}
                                    >
                                        {safeContent}
                                    </Markdown>
                                ) : (
                                    <p className="text-gray-400">Loading response...</p>
                                )}
                            </div>
                            </>
                        )
                    }
                </div>
            </div>
        </div>
    )
}

export default Message
