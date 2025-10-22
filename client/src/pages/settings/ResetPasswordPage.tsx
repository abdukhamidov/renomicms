import { useState } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { updatePassword } from "@/api/auth";
import { useAuth } from "@/contexts/useAuth";

export function ResetPasswordPage() {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string }>({ type: "idle" });

  const canSubmit = Boolean(
    token &&
      currentPassword.trim().length >= 3 &&
      newPassword.trim().length >= 6 &&
      newPassword === repeatPassword &&
      status.type !== "loading",
  );

  async function handleSubmit() {
    if (!token) {
      setStatus({ type: "error", message: "Необходимо войти в аккаунт." });
      return;
    }

    if (newPassword !== repeatPassword) {
      setStatus({ type: "error", message: "Пароли должны совпадать." });
      return;
    }

    setStatus({ type: "loading" });
    try {
      await updatePassword({ currentPassword, newPassword }, token);
      setStatus({ type: "success", message: "Пароль успешно обновлён." });
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Не удалось изменить пароль.",
      });
    }
  }

  return (
    <SettingsLayout title="Изменить пароль">
      <div className="flex flex-col w-full max-w-[540px] gap-3 bg-[#131313] border border-[#1D1D1D] text-white rounded-[12px] p-4">
        <PasswordField
          label="Текущий пароль"
          value={currentPassword}
          onChange={setCurrentPassword}
          placeholder="Введите текущий пароль"
          id="current-password"
        />
        <PasswordField
          label="Новый пароль"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="Придумайте новый пароль"
          id="new-password"
        />
        <PasswordField
          label="Повторите пароль"
          value={repeatPassword}
          onChange={setRepeatPassword}
          placeholder="Повторите новый пароль"
          id="repeat-password"
        />
      </div>

      {status.type === "error" ? (
        <div className="w-full max-w-[540px] rounded-[12px] border border-[#3f1d1d] bg-[#1f0c0c] p-3 text-[14px] text-[#fca5a5]">
          {status.message ?? "Не удалось изменить пароль."}
        </div>
      ) : null}

      {status.type === "success" ? (
        <div className="w-full max-w-[540px] rounded-[12px] border border-[#1d3f2b] bg-[#102215] p-3 text-[14px] text-[#86efac]">
          {status.message ?? "Пароль успешно изменён."}
        </div>
      ) : null}

      <div className="w-full max-w-[540px]">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-2 py-3 bg-[#31AEEC] text-black font-bold rounded-[8px] w-full hover:bg-[#3abdff] disabled:opacity-60"
        >
          {status.type === "loading" ? "Сохранение..." : "Сохранить новый пароль"}
        </button>
      </div>
    </SettingsLayout>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

function PasswordField({ id, label, placeholder, value, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label htmlFor={id} className="flex flex-col gap-2 text-[#dbdbdb]">
      <span className="px-1 text-[14px]">{label}</span>
      <div className="relative flex items-center">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-[12px] bg-[#131313] border border-[#1D1D1D] px-4 py-3 text-[14px] focus:border-[#505050] focus:outline-none placeholder:text-[#8C8C8C]"
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-3 flex items-center justify-center rounded-[8px] border border-[#1D1D1D] bg-[#0B0B0B] p-2 text-[#dbdbdb] hover:bg-[#161616]"
          aria-label={visible ? "Скрыть пароль" : "Показать пароль"}
        >
          <img src={visible ? "/design/img/eye-off.png" : "/design/img/eye.png"} alt="" className="h-4 w-4" />
        </button>
      </div>
    </label>
  );
}
