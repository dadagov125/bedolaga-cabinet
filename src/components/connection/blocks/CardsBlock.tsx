import type { BlockRendererProps } from './types';

/**
 * Шаги установки карточками. Вместо иконки — номер шага: иконка красива, но не
 * отвечает на вопрос «что делать сначала». Порядок действий человек считывает
 * по цифрам, а не по картинкам, — на этом спотыкались живые пользователи.
 */
export function CardsBlock({
  blocks,
  isLight,
  getLocalizedText,
  renderBlockButtons,
}: BlockRendererProps) {
  const visibleBlocks = blocks.filter(
    (b) =>
      getLocalizedText(b.title) ||
      getLocalizedText(b.description) ||
      b.buttons?.length ||
      b.customNode,
  );

  if (!visibleBlocks.length) return null;

  return (
    <div className="space-y-2.5">
      {visibleBlocks.map((block, index) => (
        <div
          key={index}
          className={`rounded-2xl border p-3.5 ${
            isLight
              ? 'border-dark-700/60 bg-white/80 shadow-sm'
              : 'border-dark-700/50 bg-dark-800/50'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-500/15 text-sm font-bold text-accent-400">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-semibold leading-tight text-dark-100">
                {getLocalizedText(block.title)}
              </h3>
              <p className="mt-1 whitespace-pre-line text-[13px] leading-snug text-dark-400">
                {getLocalizedText(block.description)}
              </p>
              {renderBlockButtons(block.buttons, 'light')}
              {block.customNode}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
