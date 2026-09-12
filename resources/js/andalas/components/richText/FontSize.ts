import { Extension } from "@tiptap/core";

export const FontSize = Extension.create({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) => {
          if (!size) {
            return chain()
              .setMark("textStyle", { fontSize: null })
              .removeEmptyTextStyle()
              .run();
          }
          return chain().unsetMark("textStyle").setMark("textStyle", { fontSize: size }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().unsetMark("textStyle").setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

