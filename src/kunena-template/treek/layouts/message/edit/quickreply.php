<?php

/**
 * Kunena Component
 *
 * @package         Kunena.Template.Aurelia
 * @subpackage      Layout.Message
 *
 * @copyright       Copyright (C) 2008 - 2026 Kunena Team. All rights reserved.
 * @license         https://www.gnu.org/copyleft/gpl.html GNU/GPL
 * @link            https://www.kunena.org
 **/

namespace Kunena\Forum\Site;

\defined('_JEXEC') or die();

use Joomla\CMS\HTML\HTMLHelper;
use Joomla\CMS\Language\Text;
use Kunena\Forum\Libraries\Config\KunenaConfig;
use Kunena\Forum\Libraries\Factory\KunenaFactory;
use Kunena\Forum\Libraries\Route\KunenaRoute;
use Joomla\CMS\Session\Session;
use Kunena\Forum\Libraries\Template\KunenaTemplate;
use Kunena\Forum\Libraries\User\KunenaUserHelper;

$message = $this->message;

if (!$message->isAuthorised('reply')) {
    return;
}

$author   = isset($this->author) ? $this->author : $message->getAuthor();
$topic    = isset($this->topic) ? $this->topic : $message->getTopic();
$category = isset($this->category) ? $this->category : $message->getCategory();
$config   = isset($this->config) ? $this->config : KunenaFactory::getConfig();
$me       = isset($this->me) ? $this->me : KunenaUserHelper::getMyself();
$template = KunenaTemplate::getInstance();
$subjectSuffixEnabled = $template->treekFeature('subject_suffix');
$replyFormTreekLookEnabled = $template->treekFeature('reply_form_treek_look');

$this->addScriptOptions('com_kunena.kunena_topicicontype', '');

$this->addScript('assets/js/quickreply.js');

if ($subjectSuffixEnabled) {
    $this->addScript('assets/js/treek_subject.js');
}

if (KunenaFactory::getTemplate()->params->get('formRecover')) {
    $this->addScript('sisyphus.js');
}

$quick    = $template->params->get('quick');
$editor   = $template->params->get('editor');

if ($me->canDoCaptcha() && KunenaConfig::getInstance()->quickReply) {
    $this->captchaDisplay = $template->recaptcha($message->id);
    $this->captchaEnabled = true;
}

$subject_id = 'subject' . \intval($message->id);

if ($subjectSuffixEnabled) {
    $arrowRight    = Text::_('COM_KUNENA_TREEK_ARROW_RIGHT');
    $parentSubject = $message->subject;
    $doubleArrow   = $arrowRight . ' ' . $arrowRight;

    if (mb_strpos($parentSubject, $doubleArrow) === 0) {
        $treek_suffix = ' ' . $this->escape($parentSubject);
    } else {
        $treek_suffix = ' ' . $arrowRight . ' ' . $this->escape($parentSubject);
    }

    // Cancel button data attributes, shared for both quick modes.
    $treek_btn_attrs = '
        data-treek-icon-cancel="' . Text::_('COM_KUNENA_TREEK_ARROW_CANCEL') . '"
        data-treek-icon-one="'    . Text::_('COM_KUNENA_TREEK_ARROW_CANCEL_ONE') . '"
        data-treek-icon-off="'    . Text::_('COM_KUNENA_TREEK_ARROW_SUFFIX_OFF') . '"
        data-treek-tip-cancel="'  . Text::_('COM_KUNENA_TREEK_CANCEL_SUFFIX_TOOLTIP') . '"
        data-treek-tip-one="'     . Text::_('COM_KUNENA_TREEK_CANCEL_ONE_TOOLTIP') . '"
        data-treek-tip-off="'     . Text::_('COM_KUNENA_TREEK_SUFFIX_OFF_TOOLTIP') . '"
        data-bs-toggle="tooltip"
        title="'                  . Text::_('COM_KUNENA_TREEK_CANCEL_SUFFIX_TOOLTIP') . '"';
    $treek_btn_icon = Text::_('COM_KUNENA_TREEK_ARROW_CANCEL');
}
?>

<?php if ($quick == 1) : ?>
    <div class="modal fade" id="kreply<?php echo $message->displayField('id'); ?>_form" data-bs-backdrop="false" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">
                        <?php echo Text::sprintf('COM_KUNENA_REPLYTO_X', $author->getLink()); ?>
                    </h3>
                    <button type="button" class="btn-close kreply-cancel" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="card-body">
                    <form action="<?php echo KunenaRoute::_('index.php?option=com_kunena&view=topic'); ?>" method="post" enctype="multipart/form-data" name="postform" id="postform-<?php echo $message->id; ?>" class="form-horizontal">
                        <input type="hidden" name="task" value="post" />
                        <input type="hidden" name="parentid" value="<?php echo $message->displayField('id'); ?>" />
                        <input type="hidden" name="catid" value="<?php echo $category->displayField('id'); ?>" />
                        <?php
                        // TreeK patch v1.0: hidden input removed, topic->subject no longer updated from replies.
                        // Cancelled: if (!$config->allowChangeSubject || $me->isModerator())
                        ?>
                        <?php if ($me->exists()) : ?>
                            <input type="hidden" id="kurl_users" name="kurl_users" value="<?php echo KunenaRoute::_('index.php?option=com_kunena&view=user&layout=listmention&format=raw') ?>" />
                        <?php endif; ?>
                        <?php echo HTMLHelper::_('form.token'); ?>

                        <?php if (!$me->exists()) : ?>
                            <div class="form-group">
                                <label class="col-md-12 control-label" style="padding:0;">
                                    <?php echo Text::_('COM_KUNENA_GEN_NAME'); ?>:
                                </label>
                                <input type="text" name="authorname" class="form-control" maxlength="35" placeholder="<?php echo Text::_('COM_KUNENA_GEN_NAME'); ?>" value="" required />
                            </div>
                        <?php endif; ?>

                        <?php if ($config->askEmail && !$me->exists()) : ?>
                            <div class="form-group">
                                <?php echo $config->showEmail == '0' ? Text::_('COM_KUNENA_POST_EMAIL_NEVER') : Text::_('COM_KUNENA_POST_EMAIL_REGISTERED'); ?>
                                <input type="text" id="email" name="email" placeholder="<?php echo Text::_('COM_KUNENA_TOPIC_EDIT_PLACEHOLDER_EMAIL') ?>" class="inputbox col-md-12 form-control" maxlength="45" value="" required />
                            </div>
                        <?php endif; ?>

                        <div class="form-group">
                            <label class="col-md-12 control-label" style="padding:0;">
                                <?php echo Text::_('COM_KUNENA_GEN_SUBJECT'); ?>:
                                <?php if ($subjectSuffixEnabled) : ?>
                                <a href="#"
                                   data-treek-cancel-for="<?php echo $subject_id; ?>"
                                   <?php echo $treek_btn_attrs; ?>
                                   style="text-decoration:none; margin-left:6px;">
                                    <?php echo $treek_btn_icon; ?>
                                </a>
                                <?php endif; ?>
                            </label>
                            <input type="text" id="<?php echo $subject_id; ?>" name="subject"
                                class="form-control<?php echo $subjectSuffixEnabled ? ' treek-subject-field' : ''; ?>"
                                maxlength="<?php echo $template->params->get('SubjectLengthMessage'); ?>"
                                <?php if ($subjectSuffixEnabled) : ?>
                                    data-treek-suffix="<?php echo $treek_suffix; ?>"
                                    autocomplete="off"
                                    value=""
                                <?php else : ?>
                                    value="<?php echo $replyFormTreekLookEnabled ? '' : $message->displayField('subject'); ?>"
                                <?php endif; ?> />
                        </div>

                        <div class="form-group">
                            <label class="col-md-12 control-label" style="padding:0;">
                                <?php echo Text::_('COM_KUNENA_MESSAGE'); ?>:
                            </label>
                            <?php if ($editor == 1) {
                                echo $this->subLayout('Widget/Editor')->setLayout('wysibb_quick')->set('message', $this->message)->set('config', $config);
                            } else {
                                echo '<textarea class="qreply form-control qrlocalstorage' . $message->displayField("id") . '" id="editor" name="message" rows="6" cols="60" placeholder="' . Text::_('COM_KUNENA_ENTER_MESSAGE') . '"></textarea>';
                            } ?>
                        </div>

                        <?php if ($topic->isAuthorised('subscribe')) : ?>
                            <div class="clearfix"></div>
                            <div class="control-group">
                                <div id="mesubscribe">
                                    <input style="float: left; margin-right: 10px;" type="checkbox" name="subscribeMe" id="subscribeMe" value="1" <?php if ($config->subscriptionsChecked == 1 && $me->canSubscribe != 0 || $config->subscriptionsChecked == 0 && $me->canSubscribe == 1) {
                                        echo 'checked="checked"';
                                    } ?> />
                                    <label class="string optional col-md-12 control-label" style="padding:0;" for="subscribeMe"><?php echo Text::_('COM_KUNENA_POST_NOTIFIED'); ?></label>
                                </div>
                            </div>
                        <?php endif; ?>

                        <?php if ($me->exists() && $category->allowAnonymous) : ?>
                            <div class="control-group">
                                <div class="controls">
                                    <input style="float: left; margin-right: 10px;" type="checkbox" id="kanonymous<?php echo $message->displayField('id'); ?>" name="anonymous" value="1" <?php if ($category->postAnonymous) {
                                        echo 'checked="checked"';
                                    } ?> />
                                    <label for="kanonymous<?php echo \intval($message->id); ?>">
                                        <?php echo Text::_('COM_KUNENA_POST_AS_ANONYMOUS_DESC'); ?>
                                    </label>
                                </div>
                            </div>
                        <?php endif; ?>
                        <a id="qrlocalstorage<?php echo $message->displayField('id'); ?>" href="<?php echo KunenaRoute::_('index.php?option=com_kunena&view=topic&layout=reply&catid=' . $message->catid . '&id=' . $message->thread . '&mesid=' . $message->id . '&Itemid=' . KunenaRoute::getItemID()) ?>" role="button" class="btn btn-outline-primary border btn-small btn-link float-end gotoeditor" rel="nofollow"><?php echo Text::_('COM_KUNENA_GO_TO_EDITOR'); ?></a>
                        <br />

                        <?php if (!empty($this->captchaEnabled)) : ?>
                            <div class="control-group">
                                <?php echo $this->captchaDisplay; ?>
                            </div>
                        <?php endif; ?>

                        <div class="k-footer">
                            <small><?php echo Text::_('COM_KUNENA_QMESSAGE_NOTE'); ?></small>
                            <input type="submit" class="btn btn-outline-primary border kreply-submit" name="submit" value="<?php echo Text::_('COM_KUNENA_SUBMIT'); ?>" data-bs-toggle="tooltip" title="<?php echo Text::_('COM_KUNENA_EDITOR_HELPLINE_SUBMIT'); ?>" />
                            <input type="reset" name="reset" class="btn btn-outline-primary border kreply-cancel" value="<?php echo ' ' . Text::_('COM_KUNENA_CANCEL') . ' '; ?>" data-bs-toggle="tooltip" title="<?php echo Text::_('COM_KUNENA_EDITOR_HELPLINE_CANCEL'); ?>" data-bs-dismiss="modal" aria-hidden="true" />
                        </div>
                        <input type="hidden" id="kurl_emojis" name="kurl_emojis" value="<?php echo KunenaRoute::_('index.php?option=com_kunena&view=topic&layout=listemoji&format=raw') ?>" />
                        <input type="hidden" id="kemojis_allowed" name="kemojis_allowed" value="<?php echo $template->params->get('disableEmoticons', '0'); ?>" />
                    </form>
                </div>
            </div>
        </div>
    </div>
<?php elseif ($quick == 0) : ?>
    <div class="modal fade" style="position: relative; top: 10px; right: -10px; z-index: 1; width: 100%;display: none;" id="kreply<?php echo $message->displayField('id'); ?>_form" data-bs-backdrop="false" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="staticBackdropLabel"><?php echo Text::sprintf('COM_KUNENA_REPLYTO_X', $author->getLink()); ?></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form action="<?php echo KunenaRoute::_('index.php?option=com_kunena&view=topic'); ?>" method="post" enctype="multipart/form-data" name="postform" id="postform-<?php echo $message->id; ?>" class="form-horizontal">
                        <input type="hidden" name="task" value="post" />
                        <input type="hidden" name="parentid" value="<?php echo $message->displayField('id'); ?>" />
                        <input type="hidden" name="catid" value="<?php echo $category->displayField('id'); ?>" />
                        <?php
                        // TreeK patch v1.0: hidden input removed, topic->subject no longer updated from replies.
                        // Cancelled: if (!$config->allowChangeSubject || $me->isModerator())
                        ?>
                        <?php if ($me->exists()) : ?>
                            <input type="hidden" id="kurl_users" name="kurl_users" value="<?php echo KunenaRoute::_('index.php?option=com_kunena&view=user&layout=listmention&format=raw') ?>" />
                        <?php endif; ?>
                        <?php echo HTMLHelper::_('form.token'); ?>

                        <div class="card-body">
                            <?php if (!$me->exists()) : ?>
                                <div class="form-group">
                                    <label class="col-md-12 control-label" style="padding:0;">
                                        <?php echo Text::_('COM_KUNENA_GEN_NAME'); ?>:
                                    </label>
                                    <input type="text" name="authorname" class="form-control" maxlength="35" placeholder="<?php echo Text::_('COM_KUNENA_GEN_NAME'); ?>" value="" required />
                                </div>
                            <?php endif; ?>

                            <?php if ($config->askEmail && !$me->exists()) : ?>
                                <div class="form-group">
                                    <?php echo $config->showEmail == '0' ? Text::_('COM_KUNENA_POST_EMAIL_NEVER') : Text::_('COM_KUNENA_POST_EMAIL_REGISTERED'); ?>
                                    <input type="text" id="email" name="email" placeholder="<?php echo Text::_('COM_KUNENA_TOPIC_EDIT_PLACEHOLDER_EMAIL') ?>" class="inputbox col-md-12 form-control" maxlength="45" value="" required />
                                </div>
                            <?php endif; ?>

                            <div class="form-group">
                                <label class="col-md-12 control-label" style="padding:0;">
                                    <?php echo Text::_('COM_KUNENA_GEN_SUBJECT'); ?>:
                                    <?php if ($subjectSuffixEnabled) : ?>
                                    <a href="#"
                                       data-treek-cancel-for="<?php echo $subject_id; ?>"
                                       <?php echo $treek_btn_attrs; ?>
                                       style="text-decoration:none; margin-left:6px;">
                                        <?php echo $treek_btn_icon; ?>
                                    </a>
                                    <?php endif; ?>
                                </label>
                                <input type="text" id="<?php echo $subject_id; ?>" name="subject"
                                    class="form-control<?php echo $subjectSuffixEnabled ? ' treek-subject-field' : ''; ?>"
                                    maxlength="<?php echo $template->params->get('SubjectLengthMessage'); ?>"
                                    <?php if ($subjectSuffixEnabled) : ?>
                                        data-treek-suffix="<?php echo $treek_suffix; ?>"
                                        autocomplete="off"
                                        value=""
                                    <?php else : ?>
                                        value="<?php echo $replyFormTreekLookEnabled ? '' : $message->displayField('subject'); ?>"
                                    <?php endif; ?> />
                            </div>

                            <div class="form-group">
                                <div class="col-md-12 control-label" style="padding:0;">
                                    <?php echo Text::_('COM_KUNENA_MESSAGE'); ?>:
                                </div>
                                <?php if ($editor == 1) {
                                    echo $this->subLayout('Widget/Editor')->setLayout('wysibb_quick')->set('message', $this->message)->set('config', $config);
                                } else {
                                    echo '<textarea class="qreply form-control qrlocalstorage' . $message->displayField("id") . '" id="editor" name="message" rows="6" cols="60" placeholder="' . Text::_('COM_KUNENA_ENTER_MESSAGE') . '"></textarea>';
                                } ?>
                            </div>

                            <?php if ($topic->isAuthorised('subscribe')) : ?>
                                <div class="clearfix"></div>
                                <div class="control-group">
                                    <div id="mesubscribe">
                                        <input style="float: left; margin-right: 10px;" type="checkbox" name="subscribeMe" id="subscribeMe" value="1" <?php if ($config->subscriptionsChecked == 1 && $me->canSubscribe != 0 || $config->subscriptionsChecked == 0 && $me->canSubscribe == 1 || $category->getSubscribed($me->userid)) {
                                            echo 'checked="checked"';
                                        } ?> />
                                        <label class="string optional col-md-12 control-label" style="padding:0;" for="subscribeMe"><?php echo Text::_('COM_KUNENA_POST_NOTIFIED'); ?></label>
                                    </div>
                                </div>
                            <?php endif; ?>
                            <?php if ($me->exists() && $category->allowAnonymous) : ?>
                                <div class="control-group">
                                    <div class="controls">
                                        <input style="float: left; margin-right: 10px;" type="checkbox" id="kanonymous<?php echo $message->displayField('id'); ?>" name="anonymous" value="1" <?php if ($category->postAnonymous) {
                                            echo 'checked="checked"';
                                        } ?> />
                                        <label for="kanonymous<?php echo \intval($message->id); ?>">
                                            <?php echo Text::_('COM_KUNENA_POST_AS_ANONYMOUS_DESC'); ?>
                                        </label>
                                    </div>
                                </div>
                            <?php endif; ?>
                            <a id="qrlocalstorage<?php echo $message->displayField('id'); ?>" href="<?php echo KunenaRoute::_('index.php?option=com_kunena&view=topic&layout=reply&catid=' . $message->catid . '&id=' . $message->thread . '&mesid=' . $message->id . '&Itemid=' . KunenaRoute::getItemID()) ?>" role="button" class="btn btn-outline-primary border btn-small btn-link float-end gotoeditor" rel="nofollow"><?php echo Text::_('COM_KUNENA_GO_TO_EDITOR'); ?></a>
                            <br />
                        </div>
                        <?php if (!empty($this->captchaEnabled)) : ?>
                            <div class="control-group">
                                <?php echo $this->captchaDisplay; ?>
                            </div>
                        <?php endif; ?>
                        <div class="card-footer">
                            <small><?php echo Text::_('COM_KUNENA_QMESSAGE_NOTE'); ?></small>
                            <input type="submit" class="btn btn-outline-primary border kreply-submit" name="submit" value="<?php echo Text::_('COM_KUNENA_SUBMIT'); ?>" data-bs-toggle="tooltip" title="<?php echo Text::_('COM_KUNENA_EDITOR_HELPLINE_SUBMIT'); ?>" />
                            <input type="reset" name="reset" class="btn btn-outline-primary border kreply-cancel" value="<?php echo ' ' . Text::_('COM_KUNENA_CANCEL') . ' '; ?>" data-bs-toggle="tooltip" title="<?php echo Text::_('COM_KUNENA_EDITOR_HELPLINE_CANCEL'); ?>" data-bs-dismiss="modal" aria-hidden="true" />
                        </div>
                        <input type="hidden" id="kurl_emojis" name="kurl_emojis" value="<?php echo KunenaRoute::_('index.php?option=com_kunena&view=topic&layout=listemoji&format=raw') ?>" />
                        <input type="hidden" id="kemojis_allowed" name="kemojis_allowed" value="<?php echo $template->params->get('disableEmoticons', '0'); ?>" />
                    </form>
                </div>
            </div>
        </div>
    </div>
<?php endif;
