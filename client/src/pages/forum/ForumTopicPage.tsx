import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { NavbarActionsSheet } from "@/components/layout/NavbarActionsSheet";

type TopicActionsSheetProps = {
  open: boolean;
  onClose: () => void;
};

function TopicActionsSheet({ open, onClose }: TopicActionsSheetProps) {
  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "hidden"}`}
      data-bottom-sheet="topic-actions"
      aria-hidden={open ? "false" : "true"}
    >
      <div
        className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        data-bottom-sheet-overlay
        onClick={onClose}
      />
      <div
        className={`absolute bottom-0 left-0 right-0 bg-[#131313] border-t border-[#1D1D1D] rounded-t-[16px] px-4 pt-4 pb-6 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        data-bottom-sheet-panel
        role="menu"
      >
        <div className="mx-auto mb-4 h-[4px] w-12 rounded-full bg-[#2E2E2E]" />
        <div className="flex flex-col items-center gap-2 text-[#F5F5F5] text-[16px]">
          <button
            type="button"
            className="flex items-center gap-3 w-full max-w-[540px] rounded-[10px] border border-[#232323] bg-[#1C1C1C] p-2 px-4 text-left hover:bg-[#252525]"
            data-bottom-sheet-dismiss
            onClick={onClose}
          >
            Пожаловаться
          </button>
          <button
            type="button"
            className="flex items-center gap-3 w-full max-w-[540px] rounded-[10px] border border-[#232323] bg-[#1C1C1C] p-2 px-4 text-left hover:bg-[#252525]"
            data-bottom-sheet-dismiss
            onClick={onClose}
          >
            Скрыть пользователя
          </button>
          <button
            type="button"
            className="mt-4 w-full max-w-[540px] rounded-[10px] border border-[#232323] p-2 text-[#F5F5F5] hover:bg-[#1C1C1C]"
            data-bottom-sheet-dismiss
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

export function ForumTopicPage() {
  const [isNavbarSheetOpen, setIsNavbarSheetOpen] = useState(false);
  const [isTopicActionsOpen, setIsTopicActionsOpen] = useState(false);

  useEffect(() => {
    const fit = (element: HTMLTextAreaElement) => {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    };

    const textareas = document.querySelectorAll<HTMLTextAreaElement>("textarea[data-autosize]");
    textareas.forEach(fit);

    const handleInput = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLTextAreaElement && target.dataset.autosize !== undefined) {
        fit(target);
      }
    };

    document.addEventListener("input", handleInput);
    return () => {
      document.removeEventListener("input", handleInput);
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <div className="bg-black m-[auto] flex flex-col items-center justify-center gap-1 sm:gap-4 pb-[130px] sm:pb-[70px] sm:flex-row sm:items-start text-[#dbdbdb]">
      <DesktopSidebar />

        <div className="flex items-center justify-between z-50 w-full bg-[#131313] border-b border-[#1D1D1D] text-[#dbdbdb] sticky top-0 sm:hidden">
          <Link to="/forum/section" className="flex items-center gap-1 px-[16px] py-[14px]">
            <img src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold">Форум</div>
          <button
            type="button"
            className="flex items-center gap-1 px-[16px] py-[14px]"
            data-bottom-sheet-open="true"
            data-bottom-sheet-target="navbar-actions"
            onClick={() => setIsNavbarSheetOpen(true)}
          >
            <img src="/design/img/more.png" alt="Меню" />
          </button>
        </div>
      <div className="w-full max-w-[540px] flex flex-col gap-2 items-center text-[14px] p-3 sm:gap-4 sm:p-0">
        

        <div className="hidden sm:flex items-center pt-1 justify-between w-full text-[#dbdbdb] sticky top-0 bg-black z-50">
          <Link to="/forum/section" className="flex items-center gap-1 pr-4 py-3">
            <img className="w-[26px]" src="/design/img/back.png" alt="Назад" />
          </Link>
          <div className="flex justify-center font-semibold text-[16px] gap-2">
            <p>Форум</p>
            <p className="text-[#414141] font-bold">/</p>
            <p>Название раздела</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 pl-4 py-3"
            data-bottom-sheet-open="true"
            data-bottom-sheet-target="navbar-actions"
            onClick={() => setIsNavbarSheetOpen(true)}
          >
            <img className="w-[26px]" src="/design/img/more.png" alt="Меню" />
          </button>
        </div>

        <div className="flex flex-col w-full max-w-[540px] gap-3 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
          <div className="flex justify-between gap-2">
            <div className="flex gap-2">
              <a href="#">
                <img className="w-[42px] h-[42px] rounded-[8px] object-cover" src="/design/img/default-avatar.png" alt="Автор" />
              </a>
              <div className="flex flex-col justify-center gap-1">
                <div className="flex items-center gap-1">
                  <div className="font-semibold text-[16px]">
                    <a href="#">shuname</a>
                  </div>
                  <img className="w-[18px]" src="/design/img/badge.png" alt="" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-[12px] text-[#e1e1e1] mt-[-4px]">Сегодня в 14:52</div>
                </div>
              </div>
            </div>
            <div className="flex items-start justify-end">
              <button
                type="button"
                data-bottom-sheet-open="true"
                data-bottom-sheet-target="topic-actions"
                onClick={() => setIsTopicActionsOpen(true)}
              >
                <img className="p-2 hover:bg-[#1D1D1D] rounded-[8px]" src="/design/img/more-gray.png" alt="Меню" />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-[#e1e1e1] text-[16px]">
            <p>Спустя 15 лет отсутствия</p>
            <p>
              Всех приветствую. Занимался кодами еще в 2009 - 2012 . Сидел на DCMS 7. Кто с тех времен остался ?
              ЕСЛИ кто помнит был у меня сайт по дизайну. Кто остался с тех времен?????
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center pb-0 gap-2">
              <button className="p-2 hover:bg-[#0d1f12] rounded-[9999px]">
                <img width={18} height={18} src="/design/img/vote-up.png" alt="" />
              </button>
              <span className="cursor-pointer">5</span>
              <button className="p-2 hover:bg-[#61111f] rounded-[9999px]">
                <img src="/design/img/vote-down.png" alt="" />
              </button>
            </div>
            <button className="py-[6px] px-[8px] text-[#31AEEC] hover:bg-[#0c2836] rounded-[8px]">Ответить</button>
          </div>
        </div>

        <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/design/img/comment-gray.png" alt="" />
              <p className="text-[#e1e1e1]">Комментарии: 5</p>
            </div>
            <div className="flex items-center gap-2">
              <img src="/design/img/eye.png" alt="" />
              <p className="text-[#e1e1e1] mt-[2px]">5</p>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
          <div className="flex items-start gap-2 pb-2">
            <img className="mt-[12px]" src="/design/img/reply.png" alt="" />
            <p className="w-full rounded-[8px] text-[#e1e1e1] px-3 py-2 border border-dashed hover:border-[#444] border-[#333] cursor-pointer">
              <b>December,</b> Да. Шикарное было увлечение на тот момент smile С php и css многие здесь начинали осваивать!
            </p>
            <button type="button">
              <img className="p-2 pr-0 pl-1" src="/design/img/close.png" alt="" />
            </button>
          </div>
          <form className="flex flex-col w-full max-w-[540px]" onSubmit={handleSubmit}>
            <textarea
              data-autosize
              rows={1}
              placeholder="Хотите ответить? Поделитесь мнением"
              className="w-full bg-[#131313] text-[#dbdbdb] placeholder:text-[#8C8C8C] resize-none overflow-hidden leading-[1.4] border-0 focus:ring-0 focus:outline-none min-h-[32px] max-h-[50vh]"
            />
          </form>
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <button type="button" className="p-1 pl-0 pb-0">
                <img src="/design/img/image.png" alt="" />
              </button>
              <button type="button" className="p-1 pb-0">
                <img src="/design/img/text-font.png" alt="" />
              </button>
            </div>
            <button type="submit" className="py-[6px] px-[8px] font-bold text-[#000000] bg-[#32afed] hover:bg-[#2b99cf] rounded-[8px]">
              Отправить
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center text-[#dbdbdb] gap-2">
          <div className="w-[120px] h-[120px] flex items-center justify-center rounded-[20px] border border-dashed border-[#1D1D1D] bg-[#0B0B0B]">
            <img src="/design/img/comment.png" alt="Нет комментариев" className="w-12 h-12 opacity-70" />
          </div>
          <p className="text-[16px] font-bold">Нет комментарии</p>
          <p>Будьте первым напишите комментарий</p>
        </div>

        <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
          <div className="flex justify-between gap-2">
            <div className="flex gap-2">
              <a href="#">
                <img className="w-[42px] h-[42px] rounded-[8px] object-cover" src="/design/img/avatar1.jpg" alt="liza" />
              </a>
              <div className="flex flex-col justify-center gap-1">
                <div className="flex items-center gap-1">
                  <div className="font-semibold text-[16px]">
                    <a href="#">liza</a>
                  </div>
                  <img className="w-[18px]" src="/design/img/badge.png" alt="" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-[12px] text-[#e1e1e1] mt-[-4px]">Сегодня в 14:52</div>
                </div>
              </div>
            </div>
            <div className="flex items-start justify-end">
              <button
                type="button"
                data-bottom-sheet-open="true"
                data-bottom-sheet-target="topic-actions"
                onClick={() => setIsTopicActionsOpen(true)}
              >
                <img className="p-2 hover:bg-[#1D1D1D] rounded-[8px]" src="/design/img/more-gray.png" alt="Меню" />
              </button>
            </div>
          </div>
          <div className="text-[#e1e1e1] text-[16px]">Еще живой, даже пароль вспомнил. Я один из первых, ID 17</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center pb-0 gap-2">
              <button className="p-2 hover:bg-[#0d1f12] rounded-[9999px]">
                <img width={18} height={18} src="/design/img/vote-up.png" alt="" />
              </button>
              <span className="cursor-pointer">12</span>
              <button className="p-2 hover:bg-[#61111f] rounded-[9999px]">
                <img src="/design/img/vote-down.png" alt="" />
              </button>
            </div>
            <button className="py-[6px] px-[8px] text-[#31AEEC] hover:bg-[#0c2836] rounded-[8px]">Ответить</button>
          </div>
        </div>

        <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
          <div className="flex justify-between gap-2">
            <div className="flex gap-2">
              <a href="#">
                <img className="w-[42px] h-[42px] rounded-[8px] object-cover" src="/design/img/avatar2.png" alt="December" />
              </a>
              <div className="flex flex-col justify-center gap-1">
                <div className="flex items-center gap-1">
                  <div className="font-semibold text-[16px]">
                    <a href="#">December</a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-[12px] text-[#e1e1e1] mt-[-4px]">5 часов назад</div>
                </div>
              </div>
            </div>
            <div className="flex items-start justify-end">
              <button
                type="button"
                data-bottom-sheet-open="true"
                data-bottom-sheet-target="topic-actions"
                onClick={() => setIsTopicActionsOpen(true)}
              >
                <img className="p-2 hover:bg-[#1D1D1D] rounded-[8px]" src="/design/img/more-gray.png" alt="Меню" />
              </button>
            </div>
          </div>
          <div className="text-[#e1e1e1] text-[16px]">
            Да. Шикарное было увлечение на тот момент smile С php и css многие здесь начинали осваивать! Прекрасные времена были, сколько азарта было, создать что-то новое, интересное))) Всем привет кто с прошлого,
            новичкам успехов в достижении целей!!
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center pb-0 gap-2">
              <button className="p-2 hover:bg-[#0d1f12] rounded-[9999px]">
                <img width={18} height={18} src="/design/img/vote-up.png" alt="" />
              </button>
              <span className="cursor-pointer">4</span>
              <button className="p-2 hover:bg-[#61111f] rounded-[9999px]">
                <img src="/design/img/vote-down.png" alt="" />
              </button>
            </div>
            <button className="py-[6px] px-[8px] text-[#31AEEC] hover:bg-[#0c2836] rounded-[8px]">Ответить</button>
          </div>
        </div>

        <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
          <div className="flex justify-between gap-2">
            <div className="flex gap-2">
              <a href="#">
                <img className="w-[42px] h-[42px] rounded-[8px] object-cover" src="/design/img/avatar3.jpg" alt="glen" />
              </a>
              <div className="flex flex-col justify-center gap-1">
                <div className="flex items-center gap-1">
                  <div className="font-semibold text-[16px]">
                    <a href="#">glen</a>
                  </div>
                  <img className="w-[18px]" src="/design/img/badge.png" alt="" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-[12px] text-[#e1e1e1] mt-[-4px]">Сегодня в 14:52</div>
                </div>
              </div>
            </div>
            <div className="flex items-start justify-end">
              <button
                type="button"
                data-bottom-sheet-open="true"
                data-bottom-sheet-target="topic-actions"
                onClick={() => setIsTopicActionsOpen(true)}
              >
                <img className="p-2 hover:bg-[#1D1D1D] rounded-[8px]" src="/design/img/more-gray.png" alt="Меню" />
              </button>
            </div>
          </div>
          <p className="text-[#e1e1e1] text-[16px]">Я остался с тех времен</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center pb-0 gap-2">
              <button className="p-2 hover:bg-[#0d1f12] rounded-[9999px]">
                <img width={18} height={18} src="/design/img/vote-up.png" alt="" />
              </button>
              <span className="cursor-pointer">5</span>
              <button className="p-2 hover:bg-[#61111f] rounded-[9999px]">
                <img src="/design/img/vote-down.png" alt="" />
              </button>
            </div>
            <button className="py-[6px] px-[8px] text-[#31AEEC] hover:bg-[#0c2836] rounded-[8px]">Ответить</button>
          </div>
        </div>

        <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
          <div className="flex justify-between gap-2">
            <div className="flex gap-2">
              <a href="#">
                <img className="w-[42px] h-[42px] rounded-[8px] object-cover" src="/design/img/avatar4.jpg" alt="anch1k" />
              </a>
              <div className="flex flex-col justify-center gap-1">
                <div className="flex items-center gap-1">
                  <div className="font-semibold text-[16px]">
                    <a href="#">anch1k</a>
                  </div>
                  <img className="w-[18px]" src="/design/img/badge.png" alt="" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-[12px] text-[#e1e1e1] mt-[-4px]">Сегодня в 14:52</div>
                </div>
              </div>
            </div>
            <div className="flex items-start justify-end">
              <button
                type="button"
                data-bottom-sheet-open="true"
                data-bottom-sheet-target="topic-actions"
                onClick={() => setIsTopicActionsOpen(true)}
              >
                <img className="p-2 hover:bg-[#1D1D1D] rounded-[8px]" src="/design/img/more-gray.png" alt="Меню" />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <img className="rounded-[8px]" src="/design/img/perlamur.jpg" alt="" />
            <p className="text-[#e1e1e1] text-[16px]">Ну я с тех времени))</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center pb-0 gap-2">
              <button className="p-2 hover:bg-[#0d1f12] rounded-[9999px]">
                <img width={18} height={18} src="/design/img/vote-up.png" alt="" />
              </button>
              <span className="cursor-pointer">-2</span>
              <button className="p-2 hover:bg-[#61111f] rounded-[9999px]">
                <img src="/design/img/vote-down.png" alt="" />
              </button>
            </div>
            <button className="py-[6px] px-[8px] text-[#31AEEC] hover:bg-[#0c2836] rounded-[8px]">Ответить</button>
          </div>
        </div>

        <div className="flex flex-col w-full max-w-[540px] gap-2 bg-[#131313] border border-[#1D1D1D] text-white p-[16px] rounded-[12px]">
          <div className="flex justify-between gap-2">
            <div className="flex gap-2">
              <a href="#">
                <img className="w-[42px] h-[42px] rounded-[8px] object-cover" src="/design/img/avatar5.jpg" alt="HolyKnight" />
              </a>
              <div className="flex flex-col justify-center gap-1">
                <div className="flex items-center gap-1">
                  <div className="font-semibold text-[16px]">
                    <a href="#">HolyKnight</a>
                  </div>
                  <img className="w-[18px]" src="/design/img/badge.png" alt="" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex text-[12px] text-[#e1e1e1] mt-[-4px]">Сегодня в 14:52</div>
                </div>
              </div>
            </div>
            <div className="flex items-start justify-end">
              <button
                type="button"
                data-bottom-sheet-open="true"
                data-bottom-sheet-target="topic-actions"
                onClick={() => setIsTopicActionsOpen(true)}
              >
                <img className="p-2 hover:bg-[#1D1D1D] rounded-[8px]" src="/design/img/more-gray.png" alt="Меню" />
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="#"
              className="flex items-start gap-2 w-full rounded-[8px] text-[#e1e1e1] px-2 py-2 bg-[#1d1d1d] border border-dashed hover:border-[#444] border-[#333]"
            >
              <img className="mt-[3px] w-[16px]" src="/design/img/reply.png" alt="" />
              <span>
                <b>December</b>, Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's
              </span>
            </a>
            <p className="text-[#e1e1e1] text-[16px]">Вопрос не полный, ты спрашиваешь кто остался живой с тех времен? )))</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center pb-0 gap-2">
              <button className="p-2 hover:bg-[#0d1f12] rounded-[9999px]">
                <img width={18} height={18} src="/design/img/vote-up.png" alt="" />
              </button>
              <span className="cursor-pointer">0</span>
              <button className="p-2 hover:bg-[#61111f] rounded-[9999px]">
                <img src="/design/img/vote-down.png" alt="" />
              </button>
            </div>
            <button className="py-[6px] px-[8px] text-[#31AEEC] hover:bg-[#0c2836] rounded-[8px]">Ответить</button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-[130px] sm:hidden z-50 bg-[#131313] border-t border-[#1D1D1D] text-white">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1d1d1d]">
          <img className="w-[16px]" src="/design/img/reply.png" alt="" />
          <p className="w-full rounded-[8px] text-[#e1e1e1] px-3 py-2 border border-[#1D1D1D] text-[12px]">Еще живой, даже пароль вспомнил. Я...</p>
          <img className="p-2 pr-0 pl-1" src="/design/img/close.png" alt="" />
        </div>
        <form className="max-w-[540px] mx-auto w-full px-3 pt-2 pb-2 flex items-end gap-1" onSubmit={handleSubmit}>
          <button type="button" className="shrink-0 self-end p-2">
            <img src="/design/img/image.png" alt="" />
          </button>
          <textarea
            data-autosize
            rows={1}
            placeholder="Сообщение"
            className="flex-1 min-w-0 bg-[#0B0B0B] text-[#dbdbdb] placeholder:text-[#8C8C8C] leading-[1.4] resize-none overflow-hidden border border-[#1D1D1D] rounded-[10px] px-3 py-2 focus:outline-none focus:ring-0 min-h-[40px] max-h-[40vh]"
          />
          <button type="submit" className="shrink-0 self-end p-2 rounded-[10px] text-[#66e48b]">
            <img className="w-6 h-6" src="/design/img/send.png" alt="" />
          </button>
        </form>
      </div>

      <MobileBottomNav activeHref="/forum" />
      <NavbarActionsSheet open={isNavbarSheetOpen} onClose={() => setIsNavbarSheetOpen(false)} />
      <TopicActionsSheet open={isTopicActionsOpen} onClose={() => setIsTopicActionsOpen(false)} />
    </div>
  );
}



