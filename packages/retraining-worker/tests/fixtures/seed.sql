INSERT INTO prompt_ledger (version_id, prompt_text, status, promoted_at, proposer_hash, model)
VALUES
  ('pv-prev-stable', 'Baseline stable prompt with chemical references.', 'SUPERSEDED', 1713180000000, 'sha256-prev', 'gpt-5-mini'),
  ('pv-active', 'Active prompt covering current summarization policy.', 'ACTIVE', 1713300000000, 'sha256-active', 'gpt-5');

INSERT INTO promotion_queue (candidate_id, proposer_hash, prompt_text, model, source_feedback, state, score_prior, created_at, ttl_cycles)
VALUES
  ('c-existing', 'sha256-existing', 'Pending candidate prompt', 'gpt-5', '["chem-17:llm_judge:0.69:Important concentration detail omitted."]', 'PENDING', 0.91, 1713300900000, 2);

INSERT INTO cycle_telemetry (cycle_id, section_id, status, total_tokens, compute_ms, executed_at, summary, average_score)
VALUES
  ('cycle-old-pass', 'ops-01', 'PASSED', 5000, 3000, 1713290000000, 'Stable operations summary.', 0.93),
  ('cycle-window-1', 'chem-17', 'FAILED', 11000, 9000, 1713300100000, 'Missed catalyst concentration.', 0.70),
  ('cycle-window-2', 'chem-18', 'FAILED', 12000, 9100, 1713300200000, 'Missed reagent ordering.', 0.72),
  ('cycle-window-3', 'chem-19', 'FAILED', 12500, 9300, 1713300300000, 'Missed inhibitor threshold.', 0.73);

INSERT INTO grader_feedback (cycle_id, section_id, grader, score, reasoning)
VALUES
  ('cycle-window-1', 'chem-17', 'chemical_name', 0.74, 'Missed cobalt-III acetate reference.'),
  ('cycle-window-1', 'chem-17', 'llm_judge', 0.69, 'Important concentration detail omitted.'),
  ('cycle-window-2', 'chem-18', 'chemical_name', 0.75, 'Missed nickel-II bromide reference.'),
  ('cycle-window-2', 'chem-18', 'llm_judge', 0.71, 'Sequence error in catalyst preparation.'),
  ('cycle-window-3', 'chem-19', 'chemical_name', 0.77, 'Missed cerium-IV sulfate reference.'),
  ('cycle-window-3', 'chem-19', 'llm_judge', 0.70, 'Inhibitor threshold was omitted.');

INSERT INTO quota_config (id, daily_token_limit)
VALUES (1, 125000);

UPDATE cycle_telemetry SET residual_drift = 0.034 WHERE cycle_id = 'cycle-window-1';
UPDATE cycle_telemetry SET residual_drift = 0.031 WHERE cycle_id = 'cycle-window-2';
UPDATE cycle_telemetry SET residual_drift = 0.029 WHERE cycle_id = 'cycle-window-3';
