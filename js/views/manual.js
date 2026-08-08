function render(container, ctx) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">マニュアル</div>
        <div class="page-desc">はじめての方向けの使い方ガイドです</div>
      </div>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0;">セットアップの順番</div>
      <ol class="hint" style="font-size:13px;color:var(--text);line-height:2;padding-left:18px;">
        <li><b>職員マスタ</b>で職員を登録します。職種・所属ユニット・常勤区分・資格（配置基準に算入できるか）・育児短時間勤務・深夜業免除の対象かどうか・<b>対応可能な勤務パターン</b>（夜勤ができない職員など）を設定してください。</li>
        <li><b>勤務パターン</b>で早番・日勤・遅番・夜勤などの時間帯と、パターンごとの必要人数・資格者最低人数を設定します（最大10種類）。</li>
        <li><b>月間シフト作成</b>で実際の月のシフトを組みます。</li>
      </ol>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0;">月間シフト作成の操作方法</div>
      <table>
        <tbody>
          <tr><td style="width:180px;">セル内の<b>プルダウン</b></td><td>勤務パターン／公休／年休を選んで割り当てます。選択肢には、その職員が「対応可能」と設定されている勤務パターンだけが表示されます。</td></tr>
          <tr><td>セル左の<b>★ボタン</b></td><td>クリックするたびに希望休の申請フラグをON/OFF切り替えます（オレンジ色になればON）。申請フラグを立てただけでは割当は変わらず、「自動作成」を実行するとその日は公休として割り当てられます。</td></tr>
          <tr><td>🪄 <b>自動作成</b></td><td>まだ何も割り当てていない空欄のセルだけを、希望休と各種要件（配置基準・資格・夜勤明け休み・11時間インターバル・週40時間・月間休日数など）に沿って自動で埋めます。すでに入力したセルや希望休は上書きしません。</td></tr>
          <tr><td>🖨 <b>印刷 / PDF</b></td><td>ブラウザの印刷機能を開きます。「PDFとして保存」を選べばPDF出力にもなります。</td></tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0;">自動作成の考え方（重要）</div>
      <p class="hint" style="font-size:13px;line-height:1.9;">
        自動作成は「絶対に矛盾のないシフト」を無理に作ろうとはしません。人員が構造的に足りない日がある場合は、その枠を<b>空欄のまま</b>残し、ダッシュボードに警告として表示します。これは、現場の状況を隠して辻褄だけ合わせるよりも、問題をそのまま可視化して管理者が判断できるようにするためです。<br><br>
        自動作成が空欄を残した場合は、ダッシュボードの警告一覧を確認し、以下のような対応を検討してください。
      </p>
      <ul class="hint" style="font-size:13px;line-height:1.9;padding-left:18px;">
        <li>該当日の必要人数・資格者要件を見直す（勤務パターンの設定）</li>
        <li>希望休を出している職員に個別に相談する</li>
        <li>非常勤職員の追加配置やシフト応援を検討する</li>
      </ul>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0;">警告の見方（ダッシュボード）</div>
      <p class="hint" style="font-size:13px;line-height:1.9;">
        ダッシュボードには「Critical Warnings（必須要件の未達）」と「Soft Warnings（希望休の未反映など）」が表示されます。日付・職員名・違反内容が一覧で確認できます。以下の項目は自動チェックの対象外のため、目視で確認してください。
      </p>
      <ul class="hint" style="font-size:13px;line-height:1.9;padding-left:18px;">
        <li>常勤が必要な職種に常勤職員が実際に確保されているか</li>
        <li>看護師の配置が支援内容に照らして適切か</li>
        <li>4ユニットそれぞれで安全確保・支援が可能な配置になっているか</li>
        <li>1か月単位の変形労働時間制を採用する場合、あらかじめ定めた枠内に収まっているか</li>
        <li>年10日以上年休が付与される職員の年5日取得義務の達成状況</li>
      </ul>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0;">管理者モード / 職員モード</div>
      <p class="hint" style="font-size:13px;line-height:1.9;">
        サイドバー下部の「権限」をクリックすると、<b>管理者モード</b>と<b>職員（閲覧のみ）モード</b>を切り替えられます。
      </p>
      <ul class="hint" style="font-size:13px;line-height:1.9;padding-left:18px;">
        <li><b>職員モード</b>：すべての画面を閲覧できますが、入力できるのは月間シフト作成画面の<b>★（希望休の申請）ボタンだけ</b>です。職員マスタ・勤務パターンの追加/編集/削除、セルへの勤務割当、自動作成、サンプルデータのリセットはできません。</li>
        <li><b>管理者モード</b>：すべての操作ができます。初めて管理者モードに切り替える際にPIN（4文字以上）を設定し、以降はそのPINの入力が必要です。PINはサイドバーの「管理者PINを変更」からいつでも変更できます。</li>
      </ul>
      <p class="hint" style="font-size:12.5px;line-height:1.8;margin-top:10px;">
        ※これはサーバーを持たないパイロット版の中での「現場の共用端末での誤操作防止」を目的とした簡易的な制限です。ブラウザの開発者ツールなどを使えば回避できてしまうため、本格的なアクセス制御ではありません。
      </p>
    </div>

    <div class="card">
      <div class="section-title" style="margin-top:0;">データについて</div>
      <p class="hint" style="font-size:13px;line-height:1.9;">
        このパイロット版はサーバーを持たず、入力したデータはこの端末のブラウザ内（localStorage）にのみ保存されます。別の端末・別のブラウザからは参照できません。管理者モードでサイドバーの「サンプルデータにリセット」を押すと、全データを消去して初期状態に戻ります。誤って押さないようご注意ください。
      </p>
    </div>
  `;
}

export { render };
