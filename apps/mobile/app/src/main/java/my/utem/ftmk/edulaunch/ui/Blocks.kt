package my.utem.ftmk.edulaunch.ui

import android.content.res.ColorStateList
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.annotation.FontRes
import androidx.annotation.StringRes
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.PopupMenu
import androidx.appcompat.content.res.AppCompatResources
import androidx.core.content.res.ResourcesCompat
import androidx.core.view.ViewCompat
import androidx.core.view.isEmpty
import androidx.core.view.isVisible
import com.google.android.material.button.MaterialButton
import com.google.android.material.chip.ChipGroup
import my.utem.ftmk.edulaunch.R

/** The design's fill colours, by token name. */
enum class Tone(@ColorRes val color: Int) {
    WHITE(R.color.white), BLUE(R.color.blue), YELLOW(R.color.yellow), MINT(R.color.mint),
    NAVY(R.color.navy), BG(R.color.bg), CREAM(R.color.cream), LINE(R.color.line), GREEN(R.color.green),
    MINT_SOFT(R.color.mint_soft), MINT_LINE(R.color.mint_line), MINT_CHIP(R.color.mint_chip), FADED(R.color.faded),
}

/** Button looks used across the mobile designs. */
enum class ButtonStyle { PRIMARY, OUTLINED, PLAIN, YELLOW }

/** A rounded label in a row of chips; [selected] chips are navy with white text. */
data class ChipSpec(
    val text: CharSequence,
    val tone: Tone = Tone.BLUE,
    val selected: Boolean = false,
    val outlined: Boolean = false,
    val semibold: Boolean = false,
    val sizeSp: Float = 13f,
    val radius: Int = 999,
    val padH: Int = 10,
    val padV: Int = 6,
    @ColorRes val textColor: Int? = null,
    val onClick: (() -> Unit)? = null,
)

/**
 * Builds a screen from the pieces the Figma frames share (eyebrow, title, cards, chips, fields, buttons),
 * one under the other in [column], [gap] dp apart (the design's auto-layout gap). Sizes are the design's dp/sp.
 */
class Blocks(val activity: AppCompatActivity, val column: LinearLayout, var gap: Int = 18) {
    private val inflater get() = activity.layoutInflater

    fun dp(value: Int) = (value * activity.resources.displayMetrics.density).toInt()
    /** A string resource; with no [args], placeholders such as "%1${'$'}d" are left as they are (a caller fills them in). */
    fun str(@StringRes id: Int, vararg args: Any): String = if (args.isEmpty()) activity.getString(id) else activity.getString(id, *args)

    /** Adds [view] [top] dp below the last block, full width unless [wrap]. */
    fun <T : View> add(view: T, top: Int = gap, wrap: Boolean = false): T {
        val params = LinearLayout.LayoutParams(
            if (wrap) ViewGroup.LayoutParams.WRAP_CONTENT else ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
        )
        params.topMargin = if (column.isEmpty()) 0 else dp(top)
        column.addView(view, params)
        return view
    }

    // ---- Text ----

    fun textView(text: CharSequence, sizeSp: Float, @FontRes font: Int = R.font.outfit_regular, @ColorRes color: Int = R.color.navy) =
        TextView(activity).apply {
            this.text = text
            setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
            typeface = ResourcesCompat.getFont(activity, font)
            setTextColor(activity.getColor(color))
        }

    fun text(text: CharSequence, sizeSp: Float, @FontRes font: Int = R.font.outfit_regular, @ColorRes color: Int = R.color.navy, top: Int = gap) =
        add(textView(text, sizeSp, font, color), top)

    fun eyebrow(@StringRes text: Int, sizeSp: Float = 12f, top: Int = gap) =
        text(str(text), sizeSp, R.font.outfit_semibold, R.color.muted, top)

    fun title(text: CharSequence, sizeSp: Float = 30f, top: Int = gap) =
        text(text, sizeSp, R.font.outfit_bold, top = top).apply { ViewCompat.setAccessibilityHeading(this, true) }

    fun title(@StringRes text: Int, sizeSp: Float = 30f, top: Int = gap) = title(str(text), sizeSp, top)

    fun intro(text: CharSequence, sizeSp: Float = 15f, top: Int = gap) = text(text, sizeSp, color = R.color.muted, top = top)
    fun intro(@StringRes text: Int, sizeSp: Float = 15f, top: Int = gap) = intro(str(text), sizeSp, top)

    /** Figma "Context illustration": a picture centred on a 150dp light blue panel. */
    fun illustration(@DrawableRes image: Int, top: Int = gap) {
        val panel = android.widget.FrameLayout(activity).apply { background = rounded(Tone.BLUE, 18) }
        panel.addView(ImageView(activity).apply {
            setImageResource(image)
            scaleType = ImageView.ScaleType.FIT_CENTER
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }, android.widget.FrameLayout.LayoutParams(dp(150), dp(150), Gravity.CENTER))
        add(panel, top)
    }

    /** A picture on its own, [size] dp square, at the start of the line. */
    fun picture(@DrawableRes image: Int, size: Int, top: Int = gap) = add(ImageView(activity).apply {
        setImageResource(image)
        scaleType = ImageView.ScaleType.FIT_CENTER
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        layoutParams = LinearLayout.LayoutParams(dp(size), dp(size))
    }, top, wrap = true).also { it.layoutParams = (it.layoutParams as LinearLayout.LayoutParams).apply { width = dp(size); height = dp(size) } }

    // ---- Cards ----

    fun rounded(tone: Tone, radius: Int, stroke: Tone? = null, strokeWidth: Int = 1) = GradientDrawable().apply {
        setColor(activity.getColor(tone.color))
        cornerRadius = dp(radius).toFloat()
        stroke?.let { setStroke(dp(strokeWidth), activity.getColor(it.color)) }
    }

    /**
     * A rounded box whose [content] is built with its own [Blocks] ([innerGap] apart). Tappable when [onClick] is set.
     */
    fun card(
        tone: Tone = Tone.WHITE,
        radius: Int = 22,
        padding: Int = 20,
        paddingV: Int = padding,
        innerGap: Int = 9,
        stroke: Tone? = null,
        top: Int = gap,
        onClick: (() -> Unit)? = null,
        content: Blocks.() -> Unit,
    ): LinearLayout {
        val box = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(tone, radius, stroke)
            setPadding(dp(padding), dp(paddingV), dp(padding), dp(paddingV))
            clipToOutline = true
            onClick?.let { action -> clickable(this) { action() } }
        }
        Blocks(activity, box, innerGap).content()
        return add(box, top)
    }

    /** Figma "Detail / …" and program tiles: a heading and a line of text in a rounded box. */
    fun infoCard(
        title: CharSequence,
        body: CharSequence?,
        tone: Tone = Tone.WHITE,
        radius: Int = 22,
        titleSize: Float = 19f,
        bodySize: Float = 14f,
        innerGap: Int = 9,
        top: Int = gap,
        onClick: (() -> Unit)? = null,
    ) = card(tone, radius, innerGap = innerGap, top = top, onClick = onClick) {
        text(title, titleSize, R.font.outfit_semibold)
        body?.let { intro(it, bodySize) }
    }

    /** Lines of "label   value" (Figma uses spaced text; here a two-column row). */
    fun pairs(lines: List<Pair<CharSequence, CharSequence>>, sizeSp: Float = 15f, @FontRes font: Int = R.font.outfit_medium, @ColorRes color: Int = R.color.navy, top: Int = gap) {
        val box = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
        lines.forEach { (label, value) ->
            box.addView(LinearLayout(activity).apply {
                addView(textView(label, sizeSp, font, color), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
                addView(textView(value, sizeSp, font, color), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            })
        }
        add(box, top)
    }

    /** "✓ reason" / "! caution" / "— not yet" lines with a coloured mark. */
    fun marked(mark: String, text: CharSequence, @ColorRes markColor: Int, sizeSp: Float = 13f, @ColorRes textColor: Int = R.color.navy, top: Int = gap) {
        val row = LinearLayout(activity)
        row.addView(textView(mark, sizeSp, R.font.outfit_bold, markColor).apply { importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO })
        row.addView(textView(text, sizeSp, color = textColor), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(8) })
        add(row, top)
    }

    /** A thin bar filled to [fraction] (Figma "Progress track"). */
    fun progress(fraction: Float, fill: Tone = Tone.YELLOW, height: Int = 8, top: Int = gap) {
        val track = android.widget.FrameLayout(activity).apply { background = rounded(Tone.LINE, height / 2) }
        val bar = View(activity).apply { background = rounded(fill, height / 2) }
        track.addView(bar, android.widget.FrameLayout.LayoutParams(0, dp(height)))
        track.minimumHeight = dp(height)
        add(track, top)
        track.post { bar.layoutParams = bar.layoutParams.apply { width = (track.width * fraction).toInt() }; bar.requestLayout() }
    }

    // ---- Chips ----

    fun chip(spec: ChipSpec): TextView = textView(spec.text, spec.sizeSp, if (spec.selected || spec.semibold) R.font.outfit_semibold else R.font.outfit_medium,
        spec.textColor ?: if (spec.selected) R.color.white else R.color.navy).apply {
        background = when {
            spec.selected -> rounded(Tone.NAVY, spec.radius)
            spec.outlined -> rounded(Tone.WHITE, spec.radius, Tone.LINE).apply { setColor(0) }
            else -> rounded(spec.tone, spec.radius)
        }
        setPadding(dp(spec.padH), dp(spec.padV), dp(spec.padH), dp(spec.padV))
        isSelected = spec.selected
        spec.onClick?.let { action -> clickable(this) { action() } }
    }

    /** A wrapping row of chips, 6dp apart. */
    fun chips(specs: List<ChipSpec>, spacing: Int = 6, top: Int = gap): ChipGroup {
        val group = ChipGroup(activity).apply {
            chipSpacingHorizontal = dp(spacing)
            chipSpacingVertical = dp(spacing)
        }
        specs.forEach { group.addView(chip(it)) }
        return add(group, top)
    }

    /** One rounded label on its own line (Figma "Badge / …"). */
    fun badge(text: CharSequence, tone: Tone = Tone.YELLOW, sizeSp: Float = 12f, radius: Int = 12, top: Int = gap) =
        add(textView(text, sizeSp, R.font.outfit_medium).apply {
            background = rounded(tone, radius)
            setPadding(dp(9), dp(9), dp(9), dp(9))
        }, top, wrap = true)

    /**
     * Figma "Penunjuk / …": a tappable yellow strip with an icon, a title and a line, and an arrow.
     */
    fun linkBanner(@DrawableRes icon: Int, title: CharSequence, body: CharSequence, tone: Tone = Tone.YELLOW, top: Int = gap, onClick: () -> Unit): LinearLayout {
        val strip = LinearLayout(activity).apply {
            gravity = Gravity.CENTER_VERTICAL
            background = rounded(tone, 14)
            setPadding(dp(14), dp(12), dp(12), dp(12))
            minimumHeight = dp(48)
            clickable(this, onClick)
        }
        strip.addView(ImageView(activity).apply {
            setImageResource(icon)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }, LinearLayout.LayoutParams(dp(22), dp(22)))
        val texts = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
        texts.addView(textView(title, 15f, R.font.outfit_semibold))
        texts.addView(textView(body, 12f).apply { setPadding(0, dp(2), 0, 0) })
        strip.addView(texts, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { marginStart = dp(10); marginEnd = dp(10) })
        strip.addView(ImageView(activity).apply {
            setImageResource(R.drawable.ic_arrow_right)
            imageTintList = ColorStateList.valueOf(activity.getColor(R.color.navy))
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }, LinearLayout.LayoutParams(dp(20), dp(20)))
        return add(strip, top)
    }

    /** Small bars filled [filled] of [total] in [fill] (Figma "Meter"). */
    fun meter(filled: Int, total: Int = 3, fill: Tone = Tone.YELLOW): LinearLayout = LinearLayout(activity).apply {
        repeat(total) { i ->
            addView(View(activity).apply { background = rounded(if (i < filled) fill else Tone.LINE, 4) },
                LinearLayout.LayoutParams(dp(16), dp(7)).apply { if (i > 0) marginStart = dp(3) })
        }
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    /** Views in one line, left to right, [spacing] apart, vertically centred, keeping their own widths. */
    fun inline(vararg views: View, spacing: Int = 8, top: Int = gap): LinearLayout {
        val line = LinearLayout(activity).apply { gravity = Gravity.CENTER_VERTICAL }
        views.forEachIndexed { i, v ->
            line.addView(v, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { if (i > 0) marginStart = dp(spacing) })
        }
        return add(line, top)
    }

    // ---- Buttons ----

    fun button(
        text: CharSequence,
        @DrawableRes icon: Int? = null,
        iconAtEnd: Boolean = false,
        style: ButtonStyle = ButtonStyle.PRIMARY,
        radius: Int = 10,
        wrap: Boolean = false,
        top: Int = gap,
        onClick: () -> Unit,
    ): MaterialButton {
        val layout = if (style == ButtonStyle.PRIMARY || style == ButtonStyle.YELLOW) R.layout.item_action_primary else R.layout.item_action_outlined
        val button = inflater.inflate(layout, column, false) as MaterialButton
        button.text = text
        if (icon != null) button.setIconResource(icon) else button.icon = null
        button.iconGravity = if (iconAtEnd) MaterialButton.ICON_GRAVITY_TEXT_END else MaterialButton.ICON_GRAVITY_TEXT_START
        button.cornerRadius = dp(radius)
        when (style) {
            ButtonStyle.PLAIN -> button.strokeWidth = 0
            ButtonStyle.YELLOW -> {
                button.backgroundTintList = ColorStateList.valueOf(activity.getColor(R.color.yellow))
                button.setTextColor(activity.getColor(R.color.navy))
                button.iconTint = ColorStateList.valueOf(activity.getColor(R.color.navy))
            }
            else -> Unit
        }
        button.minHeight = dp(52)
        if (wrap) button.setPadding(dp(16), 0, dp(16), 0)
        button.setOnClickListener { onClick() }
        return add(button, top, wrap)
    }

    fun button(@StringRes text: Int, @DrawableRes icon: Int? = null, iconAtEnd: Boolean = false, style: ButtonStyle = ButtonStyle.PRIMARY,
               radius: Int = 10, wrap: Boolean = false, top: Int = gap, onClick: () -> Unit) =
        button(str(text), icon, iconAtEnd, style, radius, wrap, top, onClick)

    /** Several views side by side, sharing the width ([spacing] dp apart). */
    fun row(vararg views: View, spacing: Int = 8, top: Int = gap): LinearLayout {
        val row = LinearLayout(activity).apply { gravity = Gravity.CENTER_VERTICAL }
        views.forEachIndexed { i, v ->
            (v.parent as? ViewGroup)?.removeView(v)
            // Buttons sharing a line keep their label on one line.
            if (v is MaterialButton) { v.maxLines = 1; v.ellipsize = android.text.TextUtils.TruncateAt.END }
            row.addView(v, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { if (i > 0) marginStart = dp(spacing) })
        }
        return add(row, top)
    }

    // ---- Form fields ----

    /** A labelled box that opens [options] in a menu. */
    fun dropdown(@StringRes label: Int, options: List<String>, selected: Int?, placeholder: String? = null, top: Int = gap, onPick: (Int) -> Unit = {}): View {
        val field = inflater.inflate(R.layout.item_field_dropdown, column, false)
        val labelText = str(label)
        field.findViewById<TextView>(R.id.label).text = labelText
        val value = field.findViewById<TextView>(R.id.value)
        fun set(i: Int?) {
            value.text = i?.let { options[it] } ?: placeholder.orEmpty()
            value.setTextColor(activity.getColor(if (i != null) R.color.navy else R.color.muted))
            value.contentDescription = "$labelText: ${value.text}"
        }
        set(selected)
        value.setOnClickListener { pickFrom(value, options) { i -> set(i); onPick(i) } }
        return add(field, top)
    }

    /**
     * A searchable list (Figma "Combobox / …"): [placeholder] when empty, × clears it, [hint] under it.
     * [onPick] gets the chosen index, or null when cleared.
     */
    fun combobox(@StringRes label: Int, options: List<String>, selected: Int?, placeholder: String, hint: String? = null, top: Int = gap, onPick: (Int?) -> Unit = {}): View {
        val field = inflater.inflate(R.layout.item_combobox, column, false)
        val labelText = str(label)
        field.findViewById<TextView>(R.id.label).text = labelText
        val box = field.findViewById<View>(R.id.box)
        val value = field.findViewById<TextView>(R.id.value)
        val clear = field.findViewById<View>(R.id.clear)
        field.findViewById<TextView>(R.id.hint).apply {
            isVisible = hint != null
            text = hint
        }
        clear.contentDescription = str(R.string.field_clear, labelText)
        fun set(i: Int?) {
            value.text = i?.let { options[it] } ?: placeholder
            value.typeface = ResourcesCompat.getFont(activity, if (i != null) R.font.outfit_medium else R.font.outfit_regular)
            value.setTextColor(activity.getColor(if (i != null) R.color.navy else R.color.muted))
            clear.isVisible = i != null
            box.contentDescription = "$labelText: ${value.text}"
        }
        set(selected)
        box.setOnClickListener { pickFrom(value, options) { i -> set(i); onPick(i) } }
        clear.setOnClickListener { set(null); onPick(null) }
        return add(field, top)
    }

    /** A labelled box the student types in. */
    fun textField(@StringRes label: Int, value: String, hint: String? = null, inputType: Int = android.text.InputType.TYPE_CLASS_TEXT, top: Int = gap): android.widget.EditText {
        val field = inflater.inflate(R.layout.item_field_text, column, false)
        field.findViewById<TextView>(R.id.label).setText(label)
        val edit = field.findViewById<android.widget.EditText>(R.id.value)
        edit.setText(value)
        edit.hint = hint
        edit.inputType = inputType
        add(field, top)
        return edit
    }

    /** Figma's segmented switch ("Kerja | Ijazah | Kedua-dua"): white track, the chosen one navy. */
    fun segmented(options: List<String>, selected: Int, top: Int = gap, onPick: (Int) -> Unit): LinearLayout {
        val track = LinearLayout(activity).apply {
            background = rounded(Tone.WHITE, 14)
            setPadding(dp(4), dp(4), dp(4), dp(4))
        }
        options.forEachIndexed { i, option ->
            val on = i == selected
            val segment = textView(option, 14f, R.font.outfit_semibold, if (on) R.color.white else R.color.navy).apply {
                gravity = Gravity.CENTER
                setPadding(0, dp(9), 0, dp(9))
                if (on) background = rounded(Tone.NAVY, 10)
                isSelected = on
                clickable(this) { onPick(i) }
            }
            track.addView(segment, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { if (i > 0) marginStart = dp(4) })
        }
        return add(track, top)
    }

    /** A step on a [pathMap]. */
    class Step(val title: CharSequence, val body: CharSequence, val tone: Tone)

    /** Figma "Path map": steps on a white panel, joined by a green line on the left. */
    fun pathMap(steps: List<Step>, top: Int = gap) {
        val map = PathMap(activity).apply {
            orientation = LinearLayout.VERTICAL
            background = rounded(Tone.WHITE, 18)
            setPadding(dp(60), dp(25), dp(17), dp(50))
        }
        val inner = Blocks(activity, map, 20)
        steps.forEach { inner.infoCard(it.title, it.body, it.tone) }
        add(map, top)
    }

    /** An option in a [flowChart]: a heading, a study step (blue) and where it leads (mint). */
    class FlowOption(
        val title: CharSequence,
        val study: CharSequence,
        val leadsTo: CharSequence,
        val tag: CharSequence? = null,
        val chosen: Boolean = false,
        val onClick: (() -> Unit)? = null,
    )

    /** Figma "Carta alir": "Sekarang" in yellow, then the options, joined by connectors; the chosen one in navy. */
    fun flowChart(nowLabel: CharSequence, now: CharSequence, options: List<FlowOption>, top: Int = gap) {
        val chart = FlowChart(activity).apply { orientation = LinearLayout.VERTICAL }
        val inner = Blocks(activity, chart, 12)
        inner.card(Tone.YELLOW, radius = 14, padding = 12, paddingV = 10, innerGap = 1) {
            text(nowLabel, 11f, R.font.outfit_semibold, R.color.muted)
            text(now, 14f, R.font.outfit_semibold)
        }
        options.forEach { option ->
            val box = inner.card(
                if (option.chosen) Tone.WHITE else Tone.FADED, radius = 14, padding = 12, paddingV = 10, innerGap = 4,
                onClick = option.onClick,
            ) {
                val title = textView(option.title, 14f, R.font.outfit_semibold)
                if (option.tag != null) {
                    inline(title, chip(ChipSpec(option.tag, Tone.YELLOW, semibold = true, sizeSp = 11f, padH = 8, padV = 2)), spacing = 6, top = 0)
                } else {
                    add(title, 0)
                }
                listOf(option.study to Tone.BLUE, option.leadsTo to Tone.MINT_CHIP).forEach { (text, tone) ->
                    inline(
                        textView("↓", 12f, R.font.outfit_bold, R.color.muted).apply { importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO },
                        chip(ChipSpec(text, tone, sizeSp = 12f, radius = 8, padH = 8, padV = 3)),
                        spacing = 6,
                    )
                }
            }
            if (option.chosen) (box.background as GradientDrawable).setStroke(dp(2), activity.getColor(R.color.navy)) else box.alpha = 0.8f
            (box.layoutParams as LinearLayout.LayoutParams).marginStart = dp(34)
            box.tag = option.chosen
        }
        add(chart, top)
    }

    /** Draws the green line and its branches behind a [pathMap]'s steps. */
    private inner class PathMap(context: android.content.Context) : LinearLayout(context) {
        private val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
            color = activity.getColor(R.color.green)
            strokeWidth = dp(4).toFloat()
        }

        init {
            setWillNotDraw(false)
        }

        override fun onDraw(canvas: android.graphics.Canvas) {
            super.onDraw(canvas)
            val x = dp(30).toFloat()
            canvas.drawLine(x, dp(32).toFloat(), x, (height - dp(50)).toFloat(), paint)
            for (i in 0 until childCount) {
                val child = getChildAt(i)
                val y = (child.top + child.bottom) / 2f
                canvas.drawLine(x, y, child.left.toFloat(), y, paint)
            }
        }
    }

    /** Draws a [flowChart]'s connectors: down from "Sekarang", then across to each option. */
    private inner class FlowChart(context: android.content.Context) : LinearLayout(context) {
        private val line = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG).apply {
            color = activity.getColor(R.color.connector)
            strokeWidth = dpf(1.5f)
            style = android.graphics.Paint.Style.STROKE
        }
        private val chosen = android.graphics.Paint(line).apply {
            color = activity.getColor(R.color.navy)
            strokeWidth = dpf(2f)
        }

        init {
            setWillNotDraw(false)
        }

        override fun onDraw(canvas: android.graphics.Canvas) {
            super.onDraw(canvas)
            if (childCount < 2) return
            val x = dpf(14f)
            val start = getChildAt(0).bottom.toFloat()
            val last = getChildAt(childCount - 1)
            canvas.drawLine(x, start, x, last.top + dpf(20f), line)
            for (i in 1 until childCount) {
                val child = getChildAt(i)
                val y = child.top + dpf(20f)
                val paint = if (child.tag == true) chosen else line
                if (child.tag == true) canvas.drawLine(x, start, x, y, paint)
                canvas.drawLine(x, y, child.left.toFloat(), y, paint)
                // A small arrowhead into the option.
                canvas.drawLine(child.left - dpf(5f), y - dpf(4f), child.left.toFloat(), y, paint)
                canvas.drawLine(child.left - dpf(5f), y + dpf(4f), child.left.toFloat(), y, paint)
            }
        }
    }

    private fun dpf(value: Float) = value * activity.resources.displayMetrics.density

    /** "i" on light blue for information, "!" on cream for a caution. */
    fun note(text: CharSequence, caution: Boolean = false, top: Int = gap): View {
        val note = inflater.inflate(R.layout.item_note, column, false)
        note.setBackgroundResource(if (caution) R.drawable.bg_note_cream else R.drawable.bg_note_blue)
        note.findViewById<TextView>(R.id.mark).text = if (caution) "!" else "i"
        note.findViewById<TextView>(R.id.text).text = text
        return add(note, top)
    }

    fun note(@StringRes text: Int, caution: Boolean = false, top: Int = gap) = note(str(text), caution, top)

    fun pickFrom(anchor: View, options: List<String>, onPick: (Int) -> Unit) {
        PopupMenu(activity, anchor).apply {
            options.forEachIndexed { i, option -> menu.add(0, i, i, option) }
            setOnMenuItemClickListener { item -> onPick(item.itemId); true }
            show()
        }
    }

    fun clickable(view: View, action: () -> Unit) {
        view.isClickable = true
        view.isFocusable = true
        val ripple = TypedValue().also { activity.theme.resolveAttribute(android.R.attr.selectableItemBackground, it, true) }
        view.foreground = AppCompatResources.getDrawable(activity, ripple.resourceId)
        view.setOnClickListener { action() }
    }
}
