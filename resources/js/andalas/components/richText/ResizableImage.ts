import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { ResizableImageNode } from './ResizableImageNode';

export const ResizableImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            src: {
                default: null,
            },
            alt: {
                default: null,
            },
            title: {
                default: null,
            },
            width: {
                default: 'auto',
                parseHTML: (element) => element.getAttribute('width') || 'auto',
                renderHTML: (attributes) =>
                    attributes.width && attributes.width !== 'auto'
                        ? { width: attributes.width }
                        : {},
            },
            height: {
                default: 'auto',
                parseHTML: (element) =>
                    element.getAttribute('height') || 'auto',
                renderHTML: (attributes) =>
                    attributes.height && attributes.height !== 'auto'
                        ? { height: attributes.height }
                        : {},
            },
            align: {
                default: 'left',
                parseHTML: (element) =>
                    element.getAttribute('data-align') || 'left',
                renderHTML: (attributes) =>
                    attributes.align ? { 'data-align': attributes.align } : {},
            },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageNode);
    },
});

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        resizableImage: {
            setImageWidth: (options: {
                src?: string;
                width?: string;
                height?: string;
                align?: string;
            }) => ReturnType;
        };
    }
}
