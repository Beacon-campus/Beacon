import React from 'react';
import { createPortal } from 'react-dom';
// import { X } from 'lucide-react'; // Removed dependency

const MarkdownHelp = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div
                className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800 tracking-tight">Markdown Guide</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200 text-gray-500 hover:text-gray-900"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="space-y-6">
                        <p className="text-gray-600">
                            Notes support Markdown formatting. Here is a comprehensive guide:
                        </p>

                        <div className="grid gap-6">
                            {/* Headings */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 dark:bg-zinc-800/50 dark:border-zinc-700">
                                <h3 className="font-semibold text-gray-800 mb-3">Headings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm items-center">
                                    <div className="font-mono text-blue-600 bg-blue-50/50 p-1.5 rounded text-xs"># Heading 1</div>
                                    <h1 className="text-2xl font-bold border-b pb-1">Heading 1</h1>

                                    <div className="font-mono text-blue-600 bg-blue-50/50 p-1.5 rounded text-xs">## Heading 2</div>
                                    <h2 className="text-xl font-bold border-b pb-1">Heading 2</h2>

                                    <div className="font-mono text-blue-600 bg-blue-50/50 p-1.5 rounded text-xs">### Heading 3</div>
                                    <h3 className="text-lg font-bold">Heading 3</h3>

                                    <div className="font-mono text-blue-600 bg-blue-50/50 p-1.5 rounded text-xs">#### Heading 4</div>
                                    <h4 className="text-base font-bold">Heading 4</h4>

                                    <div className="font-mono text-blue-600 bg-blue-50/50 p-1.5 rounded text-xs">##### Heading 5</div>
                                    <h5 className="text-sm font-bold text-gray-600">Heading 5</h5>
                                </div>
                            </div>

                            {/* Emphasis & Typography */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-3">Emphasis</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm items-center">
                                    <div className="font-mono text-blue-600 bg-blue-50/50 p-1.5 rounded text-xs">**Bold** or __Bold__</div>
                                    <div className="font-bold">Bold text</div>

                                    <div className="font-mono text-blue-600 bg-blue-50/50 p-1.5 rounded text-xs">*Italic* or _Italic_</div>
                                    <div className="italic">Italic text</div>

                                    <div className="font-mono text-blue-600 bg-blue-50/50 p-1.5 rounded text-xs">~~Strikethrough~~</div>
                                    <div className="line-through text-gray-500">Strikethrough</div>
                                </div>
                            </div>

                            {/* Horizontal Rules */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-3">Horizontal Rules</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm items-center">
                                    <div className="font-mono text-blue-600 bg-blue-50/50 p-1.5 rounded text-xs">---</div>
                                    <hr className="border-t border-gray-300" />

                                    <div className="font-mono text-blue-600 bg-blue-50/50 p-1.5 rounded text-xs">***</div>
                                    <hr className="border-t border-gray-300" />
                                </div>
                            </div>

                            {/* Blockquotes */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-3">Blockquotes</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                    <div className="font-mono text-blue-600 bg-blue-50/50 p-2 rounded text-xs h-fit">
                                        &gt; Blockquote<br />
                                        &gt;&gt; Nested Quote
                                    </div>
                                    <div className="space-y-2">
                                        <blockquote className="border-l-4 border-gray-300 pl-2 italic text-gray-600">
                                            Blockquote
                                            <blockquote className="border-l-4 border-gray-300 pl-2 mt-1 not-italic text-gray-500 text-xs">
                                                Nested Quote
                                            </blockquote>
                                        </blockquote>
                                    </div>
                                </div>
                            </div>

                            {/* Lists */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-3">Lists</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                    {/* Unordered */}
                                    <div className="space-y-2">
                                        <div className="font-mono text-blue-600 bg-blue-50/50 p-2 rounded text-xs">
                                            + Item 1<br />
                                            - Item 2<br />
                                            * Item 3
                                        </div>
                                        <ul className="list-disc list-inside space-y-1 ml-1 text-gray-700">
                                            <li>Item 1</li>
                                            <li>Item 2</li>
                                            <li>Item 3</li>
                                        </ul>
                                    </div>
                                    {/* Ordered */}
                                    <div className="space-y-2">
                                        <div className="font-mono text-blue-600 bg-blue-50/50 p-2 rounded text-xs">
                                            1. First<br />
                                            2. Second<br />
                                            3. Third
                                        </div>
                                        <ol className="list-decimal list-inside space-y-1 ml-1 text-gray-700">
                                            <li>First</li>
                                            <li>Second</li>
                                            <li>Third</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>

                            {/* Code */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-3">Code</h3>
                                <div className="space-y-4 text-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 items-center">
                                        <div className="font-mono text-blue-600 bg-blue-50/50 p-1.5 rounded text-xs">`inline code`</div>
                                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-red-500">inline code</code>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="font-mono text-blue-600 bg-blue-50/50 p-2 rounded text-xs">
                                            ```javascript<br />
                                            var foo = function (bar) &#123;<br />
                                            &nbsp;&nbsp;return bar++;<br />
                                            &#125;;<br />
                                            ```
                                        </div>
                                        <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto font-mono">
                                            <span className="text-purple-400">var</span> <span className="text-blue-400">foo</span> = <span className="text-purple-400">function</span> (bar) &#123;{'\n'}
                                            &nbsp;&nbsp;<span className="text-purple-400">return</span> bar++;{'\n'}
                                            &#125;;
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            {/* Tables */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-3">Tables</h3>
                                <div className="space-y-4 text-sm">
                                    <div className="font-mono text-blue-600 bg-blue-50/50 p-2 rounded text-xs overflow-x-auto whitespace-pre">
                                        | Option | Description |<br />
                                        | ------ | ----------- |<br />
                                        | data   | path to data |<br />
                                        | engine | engine used  |
                                    </div>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-xs bg-white">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="p-2 font-semibold">Option</th>
                                                    <th className="p-2 font-semibold border-l border-gray-200">Description</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                <tr>
                                                    <td className="p-2 font-mono text-purple-600">data</td>
                                                    <td className="p-2 border-l border-gray-100">path to data</td>
                                                </tr>
                                                <tr>
                                                    <td className="p-2 font-mono text-purple-600">engine</td>
                                                    <td className="p-2 border-l border-gray-100">engine used</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Links & Images */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <h3 className="font-semibold text-gray-800 mb-3">Links & Images</h3>
                                <div className="grid grid-cols-1 gap-4 text-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                        <div className="font-mono text-blue-600 bg-blue-50/50 p-2 rounded text-xs overflow-hidden text-ellipsis whitespace-nowrap">[Link](http://example.com)</div>
                                        <a href="#" className="text-blue-600 underline hover:text-blue-800">Link</a>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="font-mono text-blue-600 bg-blue-50/50 p-2 rounded text-xs">![Alt Text](https://source.unsplash.com/random/800x600)</div>
                                        <div className="rounded-lg bg-gray-200 h-24 w-full flex items-center justify-center text-gray-500 text-xs italic">
                                            Image Preview
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-black text-white rounded-xl font-medium hover:bg-gray-900 transition-colors shadow-lg shadow-gray-200"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MarkdownHelp;
