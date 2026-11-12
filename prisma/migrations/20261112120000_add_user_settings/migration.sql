CREATE TABLE "user_settings" (
  "user_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id", "key"),
  CONSTRAINT "user_settings_key_check" CHECK (length("key") > 0)
);

ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON "user_settings" FOR SELECT USING (auth.uid() = "user_id");
CREATE POLICY "Users can insert own settings"
  ON "user_settings" FOR INSERT WITH CHECK (auth.uid() = "user_id");
CREATE POLICY "Users can update own settings"
  ON "user_settings" FOR UPDATE USING (auth.uid() = "user_id");
CREATE POLICY "Users can delete own settings"
  ON "user_settings" FOR DELETE USING (auth.uid() = "user_id");
